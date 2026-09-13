// =============================================================================
// Tests para src/lib/session-revalidate.ts (D-DEBT-2)
//
// Verifica la revalidación periódica de la cuenta contra la BD:
//   - usuario activo → activo true + rol, cachea (1 query por TTL)
//   - usuario inactivo/inexistente → activo false (logout)
//   - error de BD → NO invalida (activo true) y no martilla
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSql } = vi.hoisted(() => ({ mockSql: vi.fn() }));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, sql: mockSql };
});

import { getUserAuthState, resetAuthStateCache } from "@/lib/session-revalidate";

beforeEach(() => {
  mockSql.mockReset();
  resetAuthStateCache();
});

describe("getUserAuthState", () => {
  it("usuario activo → activo true + rol, y cachea (1 sola query)", async () => {
    mockSql.mockResolvedValueOnce([{ activo: true, rol: "ADMIN" }]);

    const a = await getUserAuthState(1);
    expect(a).toEqual({ activo: true, rol: "ADMIN" });

    const b = await getUserAuthState(1);
    expect(b).toEqual({ activo: true, rol: "ADMIN" });
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it("usuario inactivo → activo false", async () => {
    mockSql.mockResolvedValueOnce([{ activo: false, rol: "GESTOR" }]);
    expect(await getUserAuthState(2)).toEqual({ activo: false, rol: "GESTOR" });
  });

  it("usuario inexistente (sin filas) → activo false + rol null", async () => {
    mockSql.mockResolvedValueOnce([]);
    expect(await getUserAuthState(3)).toEqual({ activo: false, rol: null });
  });

  it("error de BD → NO invalida (activo true), no lanza, y cachea (1 query)", async () => {
    mockSql.mockRejectedValueOnce(new Error("db down"));
    const r = await getUserAuthState(4);
    expect(r.activo).toBe(true);

    const r2 = await getUserAuthState(4);
    expect(r2.activo).toBe(true);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it("resetAuthStateCache fuerza nueva consulta", async () => {
    mockSql.mockResolvedValue([{ activo: true, rol: "ADMIN" }]);
    await getUserAuthState(5);
    resetAuthStateCache();
    await getUserAuthState(5);
    expect(mockSql).toHaveBeenCalledTimes(2);
  });
});
