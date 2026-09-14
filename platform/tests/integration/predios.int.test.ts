// @vitest-environment node
// =============================================================================
// tests/integration/predios.int.test.ts — DEEPSEEK-73
//
// Test de INTEGRACIÓN de la lectura de un predio y su análisis Fase 6
// contra Postgres real (CI; local skip sin DATABASE_URL).
//
// Cubre:
//   - getPredioById(id) → objeto con nombrePredio, areaHa; id inexistente → null
//   - getPredioAnalisisCompleto(id) → objeto con claves {indicador, ambiental,
//     hidrico, intervencion, coberturas, biomas, paramos, pomcas, rfps};
//     los arrays son arrays
//
// NO crea/modifica predios (solo lectura).
// =============================================================================

import { describe, it, expect, afterAll } from "vitest";
import { sql } from "@/lib/db";
import { getPredioById } from "@/lib/repos/predios";
import { getPredioAnalisisCompleto } from "@/lib/repos/fase6";

const HAS_DB = !!process.env.DATABASE_URL;
const d = HAS_DB ? describe : describe.skip;

afterAll(async () => {
  if (HAS_DB) await sql.end({ timeout: 5 });
});

d("predios — lectura y análisis Fase 6 contra esquema real", () => {
  it("getPredioById(id real) → objeto con nombrePredio y areaHa", async () => {
    const rows = await sql<{ id_predio: number | string }[]>`
      SELECT id_predio FROM sgs_pre_predio ORDER BY id_predio LIMIT 1;
    `;
    if (rows.length === 0) {
      console.warn("BD sin predios; test reducido a smoke.");
      return;
    }
    const id = Number(rows[0]!.id_predio);
    const p = await getPredioById(id);
    expect(p).not.toBeNull();
    if (!p) return;
    expect(p.idPredio).toBe(id);
    expect(p.nombrePredio).toBeTypeOf("string");
    expect(p.nombrePredio.length).toBeGreaterThan(0);
    expect(typeof p.areaHa).toBe("number");
    expect(p.areaHa).toBeGreaterThanOrEqual(0);
  });

  it("getPredioById(999999999) → null (id inexistente)", async () => {
    const p = await getPredioById(999_999_999);
    expect(p).toBeNull();
  });

  it("getPredioAnalisisCompleto(id real) → objeto con shape esperado", async () => {
    const rows = await sql<{ id_predio: number | string }[]>`
      SELECT id_predio FROM sgs_pre_predio ORDER BY id_predio LIMIT 1;
    `;
    if (rows.length === 0) {
      console.warn("BD sin predios; test reducido a smoke.");
      return;
    }
    const id = Number(rows[0]!.id_predio);
    const a = await getPredioAnalisisCompleto(id);
    expect(a).toBeTypeOf("object");
    // Las 9 claves del shape
    expect(a).toHaveProperty("indicador");
    expect(a).toHaveProperty("ambiental");
    expect(a).toHaveProperty("hidrico");
    expect(a).toHaveProperty("intervencion");
    expect(a).toHaveProperty("coberturas");
    expect(a).toHaveProperty("biomas");
    expect(a).toHaveProperty("paramos");
    expect(a).toHaveProperty("pomcas");
    expect(a).toHaveProperty("rfps");
    // Los arrays son arrays (pueden estar vacíos)
    expect(Array.isArray(a.coberturas)).toBe(true);
    expect(Array.isArray(a.biomas)).toBe(true);
    expect(Array.isArray(a.paramos)).toBe(true);
    expect(Array.isArray(a.pomcas)).toBe(true);
    expect(Array.isArray(a.rfps)).toBe(true);
  });
});
