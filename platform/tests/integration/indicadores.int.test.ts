// @vitest-environment node
// =============================================================================
// tests/integration/indicadores.int.test.ts
//
// Test de INTEGRACIÓN con Postgres real (CI lo corre contra el servicio
// PostGIS). Localmente se SALTA si no hay DATABASE_URL — así `npm test` sigue
// verde en una máquina sin BD.
//
// Qué valida (esto es lo que faltaba: los unit tests mockean `sql` y no
// detectan bugs de SQL como el del drill-down P1-3):
//   1. La vista única sgs_v_indicador_global existe y expone los 10 indicadores.
//   2. El drill-down del repo (getPropuestasPorIndicador) RECONCILIA con el
//      global para cada indicador:
//        - líneas   → Σ longitud_km  == global
//        - polígonos→ Σ hectareas    == global
//        - puntos   → nº de filas    == global
//        - C3       → nº de filas    >= global (global = predios distintos)
// =============================================================================

import { describe, it, expect, afterAll, vi } from "vitest";

vi.mock("@/lib/repos/_cache", () => ({
  cached: <T extends (...args: any[]) => any>(fn: T) => fn,
}));

import { sql } from "@/lib/db";
import {
  getPropuestasPorIndicador,
  INDICADORES_META,
  type IndicadorKey,
} from "@/lib/repos/metas-convenio";

const HAS_DB = !!process.env.DATABASE_URL;
const d = HAS_DB ? describe : describe.skip;

const KEYS = Object.keys(INDICADORES_META) as IndicadorKey[];

afterAll(async () => {
  if (HAS_DB) await sql.end({ timeout: 5 });
});

d("indicadores — reconciliación contra Postgres real", () => {
  it("la vista sgs_v_indicador_global expone los 10 indicadores", async () => {
    const rows = await sql<{ indicador_key: string }[]>`
      SELECT indicador_key FROM sgs_v_indicador_global
    `;
    const keys = new Set(rows.map((r) => r.indicador_key));
    for (const k of KEYS) {
      expect(keys.has(k), `falta ${k} en sgs_v_indicador_global`).toBe(true);
    }
  });

  it("drill-down reconcilia con el global para cada indicador", async () => {
    const globalRows = await sql<{ indicador_key: string; actual: number | string }[]>`
      SELECT indicador_key, actual FROM sgs_v_indicador_global
    `;
    const global = Object.fromEntries(
      globalRows.map((r) => [r.indicador_key, Number(r.actual)]),
    );

    for (const key of KEYS) {
      const rows = await getPropuestasPorIndicador(key, 1_000_000);
      const meta = INDICADORES_META[key];
      const expected = global[key] ?? 0;

      if (meta.kind === "lineas") {
        const suma = rows.reduce((s, p) => s + (p.longitud_km ?? 0), 0);
        expect(Math.abs(suma - expected), `${key}: Σ km ${suma} vs global ${expected}`).toBeLessThan(0.05);
      } else if (meta.kind === "poligonos") {
        const suma = rows.reduce((s, p) => s + (p.hectareas ?? 0), 0);
        expect(Math.abs(suma - expected), `${key}: Σ ha ${suma} vs global ${expected}`).toBeLessThan(0.05);
      } else if (meta.kind === "puntos") {
        expect(rows.length, `${key}: filas ${rows.length} vs global ${expected}`).toBe(expected);
      } else {
        // C3: el global cuenta predios distintos; el drill-down lista propuestas
        expect(rows.length, `${key}: filas ${rows.length} >= global ${expected}`).toBeGreaterThanOrEqual(expected);
      }
    }
  });

  it("C2A2 (estaciones/obras) reconcilia sin depender del componente", async () => {
    const rows = await sql<{ indicador_key: string; actual: number | string }[]>`
      SELECT indicador_key, actual FROM sgs_v_indicador_global WHERE indicador_key IN ('estaciones','obras_captacion')
    `;
    for (const r of rows) {
      const drill = await getPropuestasPorIndicador(r.indicador_key as IndicadorKey, 1_000_000);
      expect(drill.length).toBe(Number(r.actual));
    }
  });
});
