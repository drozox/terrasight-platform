// @vitest-environment node
// =============================================================================
// tests/integration/workflow.int.test.ts
//
// Test de INTEGRACIÓN del workflow de intervenciones contra Postgres real
// (CI lo corre; local se SALTA sin DATABASE_URL).
//
// Valida lo que los unit tests no pueden: el UPDATE condicional
// (anti-race) + el CHECK constraint + la escritura de auditoría en
// sgs_pro_estado_historial. Es exactamente la clase de bug de P0-1.
//
// Limpieza: restaura el estado original de la propuesta y borra las filas de
// historial marcadas con usuario 'test-int'.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "@/lib/db";
import { aplicarTransicion, getHistorial } from "@/lib/repos/workflow";

const HAS_DB = !!process.env.DATABASE_URL;
const d = HAS_DB ? describe : describe.skip;
const TEST_USER = "test-int";

let idPropuesta = 0;
let estadoOriginal = "";
let hayDatos = false;

beforeAll(async () => {
  if (!HAS_DB) return;
  const rows = await sql<{ id: number | string; estado: string }[]>`
    SELECT id_propuesta AS id, estado
    FROM   sgs_pro_propuesta
    ORDER  BY id_propuesta
    LIMIT  1
  `;
  if (rows.length > 0) {
    idPropuesta = Number(rows[0].id);
    estadoOriginal = String(rows[0].estado);
    hayDatos = true;
  }
});

afterAll(async () => {
  if (HAS_DB && hayDatos) {
    await sql`UPDATE sgs_pro_propuesta SET estado = ${estadoOriginal} WHERE id_propuesta = ${idPropuesta}`;
    await sql`DELETE FROM sgs_pro_estado_historial WHERE id_propuesta = ${idPropuesta} AND usuario = ${TEST_USER}`;
  }
  if (HAS_DB) await sql.end({ timeout: 5 });
});

d("workflow — máquina de estados contra Postgres real", () => {
  it("rechaza una transición que no existe en la máquina", async () => {
    if (!hayDatos) return;
    const r = await aplicarTransicion({
      idPropuesta, from: "BORRADOR", to: "FINALIZADA", rol: "ADMIN", usuario: TEST_USER,
    });
    expect(r.ok).toBe(false);
  });

  it("aplica una transición válida y audita en el historial", async () => {
    if (!hayDatos) return;
    await sql`UPDATE sgs_pro_propuesta SET estado = 'BORRADOR' WHERE id_propuesta = ${idPropuesta}`;

    const r = await aplicarTransicion({
      idPropuesta, from: "BORRADOR", to: "EN_REVISION", rol: "GESTOR", usuario: TEST_USER,
    });
    expect(r.ok).toBe(true);
    expect(r.estado_nuevo).toBe("EN_REVISION");

    const h = await getHistorial(idPropuesta);
    expect(h[0]?.estado_nuevo).toBe("EN_REVISION");
    expect(h[0]?.usuario).toBe(TEST_USER);
  });

  it("el CHECK constraint rechaza un estado fuera del workflow", async () => {
    if (!hayDatos) return;
    await expect(
      sql`UPDATE sgs_pro_propuesta SET estado = 'Pendiente' WHERE id_propuesta = ${idPropuesta}`,
    ).rejects.toThrow();
  });

  it("respeta los roles: GESTOR no puede aprobar", async () => {
    if (!hayDatos) return;
    await sql`UPDATE sgs_pro_propuesta SET estado = 'EN_REVISION' WHERE id_propuesta = ${idPropuesta}`;
    const r = await aplicarTransicion({
      idPropuesta, from: "EN_REVISION", to: "APROBADA", rol: "GESTOR", usuario: TEST_USER,
    });
    expect(r.ok).toBe(false);
  });

  it("exige comentario para RECHAZADA", async () => {
    if (!hayDatos) return;
    await sql`UPDATE sgs_pro_propuesta SET estado = 'EN_REVISION' WHERE id_propuesta = ${idPropuesta}`;
    const r = await aplicarTransicion({
      idPropuesta, from: "EN_REVISION", to: "RECHAZADA", rol: "ADMIN", usuario: TEST_USER,
    });
    expect(r.ok).toBe(false);
  });
});
