// @vitest-environment node
// =============================================================================
// tests/integration/reportes.int.test.ts
//
// Test de INTEGRACIÓN de los 10 reportes operativos (R1–R10) contra Postgres
// real (CI; local skip sin DATABASE_URL).
//
// Objetivo: que cualquier drift de esquema/columna se detecte. Antes no había
// NINGÚN test que ejecutara el SQL de los reportes — solo el e2e de la página.
// =============================================================================

import { describe, it, expect, afterAll } from "vitest";
import { sql } from "@/lib/db";
import {
  getReporteR1, getReporteR2, getReporteR3, getReporteR4, getReporteR5,
  getReporteR6, getReporteR7, getReporteR8, getReporteR9, getReporteR10,
} from "@/lib/repos/reportes";

const HAS_DB = !!process.env.DATABASE_URL;
const d = HAS_DB ? describe : describe.skip;

afterAll(async () => {
  if (HAS_DB) await sql.end({ timeout: 5 });
});

const REPORTES = {
  R1: getReporteR1,
  R2: getReporteR2,
  R3: getReporteR3,
  R4: getReporteR4,
  R5: getReporteR5,
  R6: getReporteR6,
  R7: getReporteR7,
  R8: getReporteR8,
  R9: getReporteR9,
  R10: getReporteR10,
} as const;

d("reportes R1–R10 — corren contra el esquema real", () => {
  for (const [tipo, fn] of Object.entries(REPORTES)) {
    it(`${tipo} devuelve un array sin lanzar`, async () => {
      const rows = await fn();
      expect(Array.isArray(rows)).toBe(true);
    });
  }
});
