// @vitest-environment node
// =============================================================================
// tests/integration/reportes.int.test.ts
//
// Test de INTEGRACIÓN de los reportes vivos (R1, R2, R4, R6, R7, R10) contra
// Postgres real (CI; local skip sin DATABASE_URL). R3, R5, R8 y R9 se retiraron.
//
// Objetivo: que cualquier drift de esquema/columna se detecte.
// =============================================================================

import { describe, it, expect, afterAll } from "vitest";
import { sql } from "@/lib/db";
import {
  getReporteR1, getReporteR2, getReporteR4,
  getReporteR6, getReporteR7, getReporteR10,
} from "@/lib/repos/reportes";

const HAS_DB = !!process.env.DATABASE_URL;
const d = HAS_DB ? describe : describe.skip;

afterAll(async () => {
  if (HAS_DB) await sql.end({ timeout: 5 });
});

const REPORTES = {
  R1: getReporteR1,
  R2: getReporteR2,
  R4: getReporteR4,
  R6: getReporteR6,
  R7: getReporteR7,
  R10: getReporteR10,
} as const;

d("reportes vivos — corren contra el esquema real", () => {
  for (const [tipo, fn] of Object.entries(REPORTES)) {
    it(`${tipo} devuelve un array sin lanzar`, async () => {
      const rows = await fn();
      expect(Array.isArray(rows)).toBe(true);
    });
  }
});
