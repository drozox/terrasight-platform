// =============================================================================
// Tests para src/lib/geo/centroid.ts (F1)
//
// El bug: las geometrías del convenio son Multi* y sus coordinates vienen
// anidadas; el cálculo ingenuo daba NaN y Leaflet crasheaba.
// =============================================================================

import { describe, it, expect } from "vitest";
import { flattenPairs, bboxOf, centerAndZoomFromCoords } from "@/lib/geo/centroid";

const FB = { center: [4.92, -73.93] as [number, number], zoom: 11 };

describe("flattenPairs", () => {
  it("LineString plano", () => {
    expect(flattenPairs([[-74, 5], [-73, 4]])).toEqual([[-74, 5], [-73, 4]]);
  });

  it("MultiLineString anidado", () => {
    expect(flattenPairs([[[-74, 5], [-73, 4]], [[-72, 3]]])).toEqual([
      [-74, 5], [-73, 4], [-72, 3],
    ]);
  });

  it("MultiPolygon profundo", () => {
    expect(flattenPairs([[[[-74, 5], [-73, 4], [-74, 5]]]])).toEqual([
      [-74, 5], [-73, 4], [-74, 5],
    ]);
  });

  it("no-array → []", () => {
    expect(flattenPairs(null)).toEqual([]);
    expect(flattenPairs("x")).toEqual([]);
  });
});

describe("bboxOf", () => {
  it("calcula el bbox", () => {
    expect(bboxOf([[-74, 5], [-73, 4]])).toEqual({ minLon: -74, maxLon: -73, minLat: 4, maxLat: 5 });
  });
  it("vacío → null", () => {
    expect(bboxOf([])).toBeNull();
  });
});

describe("centerAndZoomFromCoords", () => {
  it("MultiLineString → centro finito (no NaN) dentro de Cundinamarca", () => {
    const r = centerAndZoomFromCoords([[[-74.5, 5.0], [-73.9, 5.5]]], FB);
    expect(Number.isFinite(r.center[0])).toBe(true);
    expect(Number.isFinite(r.center[1])).toBe(true);
    expect(r.center[0]).toBeGreaterThan(4);
    expect(r.center[0]).toBeLessThan(6);
  });

  it("MultiPolygon → centro finito", () => {
    const r = centerAndZoomFromCoords([[[[-74.4, 5.1], [-74.3, 5.2], [-74.4, 5.1]]]], FB);
    expect(Number.isFinite(r.center[0])).toBe(true);
    expect(Number.isFinite(r.center[1])).toBe(true);
  });

  it("coordenadas vacías → fallback", () => {
    expect(centerAndZoomFromCoords([], FB)).toEqual(FB);
  });

  it("basura no numérica → fallback (NaN-safe)", () => {
    expect(centerAndZoomFromCoords([[["x", "y"]]], FB)).toEqual(FB);
  });
});
