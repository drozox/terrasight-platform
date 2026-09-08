// =============================================================================
// Tests unitarios para src/lib/repos/spatial-select.ts
//
// Helpers puros (sin BD): normalizeBbox + bboxAreaKm2.
// El query PostGIS (CTE + UNION ALL) se valida en tests e2e contra Supabase.
// =============================================================================

import { describe, it, expect } from "vitest";
import { normalizeBbox, bboxAreaKm2 } from "@/lib/repos/spatial-select";

describe("normalizeBbox", () => {
  it("devuelve el bbox tal cual si las esquinas están en orden", () => {
    const b = normalizeBbox(-74, 4, -73, 5);
    expect(b).toEqual({ xmin: -74, ymin: 4, xmax: -73, ymax: 5 });
  });

  it("intercambia esquinas si vienen invertidas", () => {
    // Click 1 = (-73, 5), Click 2 = (-74, 4) → bbox lógico = (-74, 4) - (-73, 5)
    const b = normalizeBbox(-73, 5, -74, 4);
    expect(b).toEqual({ xmin: -74, ymin: 4, xmax: -73, ymax: 5 });
  });

  it("acepta bbox chico (≤ 5° × 5°)", () => {
    expect(() => normalizeBbox(-74, 4, -73, 5)).not.toThrow();
  });

  it("rechaza bbox ancho > 5°", () => {
    expect(() => normalizeBbox(-75, 4, -69, 5)).toThrow(/demasiado grande/);
  });

  it("rechaza bbox alto > 5°", () => {
    expect(() => normalizeBbox(-74, 0, -73, 6)).toThrow(/demasiado grande/);
  });

  it("permite personalizar el límite (maxDeg)", () => {
    expect(() => normalizeBbox(-74, 0, -73, 6, 10)).not.toThrow();
  });
});

describe("bboxAreaKm2", () => {
  it("bbox 0.04° × 0.02° cerca de Bogotá ≈ 4.4 km × 2.2 km ≈ 9.7 km²", () => {
    // GUATAVITA bbox: 0.04° ancho × 0.02° alto
    // 0.04° ancho @ lat 4.93 → 0.04 * 111.32 * cos(4.93°) ≈ 4.434 km
    // 0.02° alto → 0.02 * 110.57 ≈ 2.211 km
    // área ≈ 4.434 * 2.211 ≈ 9.81 km²
    const a = bboxAreaKm2(-73.85, 4.92, -73.81, 4.94);
    expect(a).toBeGreaterThan(9);
    expect(a).toBeLessThan(11);
  });

  it("bbox 1° × 1° en el ecuador ≈ 111.32 × 110.57 ≈ 12,308 km²", () => {
    const a = bboxAreaKm2(0, 0, 1, 1);
    // ~12308 km², tolerancia 1%
    expect(a).toBeGreaterThan(12200);
    expect(a).toBeLessThan(12400);
  });

  it("bbox 1° × 1° en latitud 60° ≈ 55.66 × 110.57 ≈ 6,154 km² (cos 60° = 0.5)", () => {
    const a = bboxAreaKm2(0, 60, 1, 61);
    expect(a).toBeGreaterThan(6000);
    expect(a).toBeLessThan(6300);
  });

  it("bbox 0 devuelve 0 km²", () => {
    expect(bboxAreaKm2(-74, 4, -74, 4)).toBe(0);
  });
});
