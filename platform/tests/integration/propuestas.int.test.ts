// @vitest-environment node
// =============================================================================
// tests/integration/propuestas.int.test.ts — DEEPSEEK-41
//
// Test de INTEGRACIÓN de la lectura de propuestas/intervenciones contra
// Postgres real (CI; local skip sin DATABASE_URL).
//
// Cubre:
//   - getIntervencionCompleta(id) — devuelve objeto con id, tipo, estado, avances
//   - getIntervencionCompleta(inexistente) → null
//   - listPropuestasSimple(limit) — array con shape PropuestaSimple
//
// NO crea/modifica propuestas (solo lectura).
// =============================================================================

import { describe, it, expect, afterAll } from "vitest";
import { sql } from "@/lib/db";
import {
  getIntervencionCompleta,
  listPropuestasSimple,
} from "@/lib/repos/propuestas";

const HAS_DB = !!process.env.DATABASE_URL;
const d = HAS_DB ? describe : describe.skip;

afterAll(async () => {
  if (HAS_DB) await sql.end({ timeout: 5 });
});

d("propuestas — lectura contra el esquema real", () => {
  it("getIntervencionCompleta(id real) → objeto con id, tipo, estado y avances", async () => {
    // Obtenemos un id real de la BD (si no hay, skip).
    const rows = await sql<{ id_propuesta: number | string }[]>`
      SELECT id_propuesta FROM sgs_pro_propuesta ORDER BY id_propuesta LIMIT 1;
    `;
    if (rows.length === 0) {
      // No skip a nivel test — devolvemos OK y logueamos.
      // (BD vacía es válido, pero no podemos verificar el shape completo.)
      console.warn("BD sin propuestas; test reducido a smoke.");
      return;
    }
    const id = Number(rows[0]!.id_propuesta);
    const intervencion = await getIntervencionCompleta(id);
    expect(intervencion).not.toBeNull();
    expect(intervencion).toBeTypeOf("object");
    if (!intervencion) return; // TS narrowing
    expect(intervencion.id).toBe(id);
    expect(["punto", "linea", "poligono"]).toContain(intervencion.tipo);
    expect(intervencion.estado).toBeTypeOf("string");
    expect(Array.isArray(intervencion.avances)).toBe(true);
  });

  it("getIntervencionCompleta(999999999) → null (id inexistente)", async () => {
    const intervencion = await getIntervencionCompleta(999_999_999);
    expect(intervencion).toBeNull();
  });

  it("listPropuestasSimple(5) → array con shape PropuestaSimple", async () => {
    const propuestas = await listPropuestasSimple(5);
    expect(Array.isArray(propuestas)).toBe(true);
    expect(propuestas.length).toBeLessThanOrEqual(5);
    // No asumimos datos exactos, pero validamos el shape si hay filas.
    if (propuestas.length > 0) {
      const first = propuestas[0]!;
      expect(first).toHaveProperty("idPropuesta");
      expect(first).toHaveProperty("tipo");
      expect(first).toHaveProperty("actividad");
      expect(["punto", "linea", "poligono"]).toContain(first.tipo);
    }
  });

  it("listPropuestasSimple(0) → respeta el limit", async () => {
    const propuestas = await listPropuestasSimple(0);
    expect(Array.isArray(propuestas)).toBe(true);
    expect(propuestas.length).toBe(0);
  });
});
