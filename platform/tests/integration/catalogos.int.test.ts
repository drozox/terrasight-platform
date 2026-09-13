// @vitest-environment node
// =============================================================================
// tests/integration/catalogos.int.test.ts — DEEPSEEK-12
//
// Tests de integración (Postgres real) para los getters READ de catálogos:
//   - getComponenteById(id)   — src/lib/repos/catalogos.ts:177
//   - getAccionById(id)        — src/lib/repos/catalogos.ts:182
//
// Patrón: tests/integration/reportes.int.test.ts.
//   - describe.skip si no hay DATABASE_URL
//   - afterAll cierra el pool
//
// NOTA: las funciones testeadas llaman internamente a listComponentesFull() /
// listAccionesFull() que están envueltas en `cached()` (unstable_cache de Next).
// `unstable_cache` requiere el contexto de Next.js runtime para funcionar, así
// que mockeamos el wrapper local `_cache` para que sea identidad — igual que en
// tests/unit/metas-convenio.test.ts.
//
// Solo READ (no crear/editar/borrar catálogos).
// =============================================================================

import { describe, it, expect, vi, afterAll } from "vitest";

// Mockeamos el wrapper local `cached()` para que sea identidad en tests.
// Sin esto, unstable_cache tira "Invariant: incrementalCache missing".
vi.mock("@/lib/repos/_cache", () => ({
  cached: <T extends (...args: any[]) => any>(fn: T) => fn,
}));

import { sql } from "@/lib/db";
import { getComponenteById, getAccionById } from "@/lib/repos/catalogos";

const HAS_DB = !!process.env.DATABASE_URL;
const d = HAS_DB ? describe : describe.skip;

afterAll(async () => {
  if (HAS_DB) await sql.end({ timeout: 5 });
});

d("catalogos read — getComponenteById / getAccionById", () => {
  it("getComponenteById(id real) devuelve objeto con nombre", async () => {
    const rows = await sql<{ id_componente: number }[]>`
      SELECT id_componente FROM sgs_com_componente LIMIT 1
    `;
    if (rows.length === 0) {
      // Sin datos sembrados — skip
      return;
    }
    const id = rows[0].id_componente;
    const c = await getComponenteById(id);
    expect(c).not.toBeNull();
    expect(typeof c!.nombre).toBe("string");
    expect(c!.nombre.length).toBeGreaterThan(0);
  });

  it("getComponenteById(id inexistente 999999) → null", async () => {
    const c = await getComponenteById(999999);
    expect(c).toBeNull();
  });

  it("getAccionById(id real) devuelve objeto con nombre", async () => {
    const rows = await sql<{ id_accion: number }[]>`
      SELECT id_accion FROM sgs_com_accion LIMIT 1
    `;
    if (rows.length === 0) {
      return;
    }
    const id = rows[0].id_accion;
    const a = await getAccionById(id);
    expect(a).not.toBeNull();
    expect(typeof a!.nombre).toBe("string");
    expect(a!.nombre.length).toBeGreaterThan(0);
  });

  it("getAccionById(id inexistente 999999) → null", async () => {
    const a = await getAccionById(999999);
    expect(a).toBeNull();
  });
});

