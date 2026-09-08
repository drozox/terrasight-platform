// =============================================================================
// Tests unitarios para src/lib/geo/measure.ts
//
// Helpers puros de medición geodésica (Vincenty distancia + excedente esférico área).
// Sin dependencia de BD, sin mocks.
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  vincentyDistance,
  haversineDistance,
  polylineLength,
  polygonArea,
  formatMeters,
  formatHectares,
} from "@/lib/geo/measure";

describe("vincentyDistance", () => {
  it("returns 0 for identical points", () => {
    expect(vincentyDistance([-74.0721, 4.7110], [-74.0721, 4.7110])).toBe(0);
  });

  it("Bogotá → Medellín ≈ 237 km (línea recta geodésica)", () => {
    // Distancia geodésica real (Vincenty inverso): 236.77 km. Toleramos ±2 km.
    const d = vincentyDistance([-74.0721, 4.7110], [-75.5636, 6.2442]);
    expect(d / 1000).toBeGreaterThan(235);
    expect(d / 1000).toBeLessThan(239);
  });

  it("1 grado de longitud en el ecuador ≈ 111 km", () => {
    // En el ecuador (lat 0), 1 grado de longitud = 111.32 km
    const d = vincentyDistance([0, 0], [1, 0]);
    expect(d / 1000).toBeGreaterThan(110);
    expect(d / 1000).toBeLessThan(112);
  });

  it("1 grado de latitud ≈ 111 km en cualquier longitud", () => {
    const dBogota = vincentyDistance([-74.0721, 4.7110], [-74.0721, 5.7110]);
    const dLondon = vincentyDistance([0, 51], [0, 52]);
    expect(dBogota / 1000).toBeGreaterThan(110);
    expect(dBogota / 1000).toBeLessThan(112);
    expect(dLondon / 1000).toBeGreaterThan(110);
    expect(dLondon / 1000).toBeLessThan(112);
  });

  it("es simétrico: distance(a,b) === distance(b,a)", () => {
    const a: [number, number] = [-74.0721, 4.7110];
    const b: [number, number] = [-75.5636, 6.2442];
    expect(vincentyDistance(a, b)).toBeCloseTo(vincentyDistance(b, a), 6);
  });
});

describe("haversineDistance", () => {
  it("retorna 0 para puntos idénticos", () => {
    expect(haversineDistance([0, 0], [0, 0])).toBe(0);
  });

  it("1 grado de longitud en el ecuador ≈ 111 km", () => {
    const d = haversineDistance([0, 0], [1, 0]);
    expect(d / 1000).toBeGreaterThan(110);
    expect(d / 1000).toBeLessThan(112);
  });

  it("es similar a Vincenty (difieren < 0.5%)", () => {
    const a: [number, number] = [-74.0721, 4.7110];
    const b: [number, number] = [-75.5636, 6.2442];
    const v = vincentyDistance(a, b);
    const h = haversineDistance(a, b);
    expect(Math.abs(v - h) / v).toBeLessThan(0.005);
  });
});

describe("polylineLength", () => {
  it("retorna 0 con menos de 2 puntos", () => {
    expect(polylineLength([])).toBe(0);
    expect(polylineLength([[0, 0]])).toBe(0);
  });

  it("2 puntos: misma distancia que vincentyDistance", () => {
    const pts: [number, number][] = [[-74.0721, 4.7110], [-75.5636, 6.2442]];
    const total = polylineLength(pts);
    const direct = vincentyDistance(pts[0], pts[1]);
    expect(total).toBeCloseTo(direct, 6);
  });

  it("3 puntos: suma de 2 segmentos", () => {
    const pts: [number, number][] = [[0, 0], [1, 0], [1, 1]];
    const seg1 = vincentyDistance([0, 0], [1, 0]);
    const seg2 = vincentyDistance([1, 0], [1, 1]);
    expect(polylineLength(pts)).toBeCloseTo(seg1 + seg2, 6);
  });
});

describe("polygonArea", () => {
  it("retorna 0 con menos de 3 puntos", () => {
    expect(polygonArea([])).toBe(0);
    expect(polygonArea([[0, 0]])).toBe(0);
    expect(polygonArea([[0, 0], [1, 0]])).toBe(0);
  });

  it("cuadrado de 1° x 1° en el ecuador ≈ 12,300 km²", () => {
    // 1 grado de longitud en ecuador = 111.32 km
    // 1 grado de latitud = 110.57 km
    // Área teórica = 111.32 × 110.57 = 12,309 km² (toleramos ±200 km² por la fórmula geodésica)
    const pts: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    const a = polygonArea(pts);
    expect(a / 1_000_000).toBeGreaterThan(12100);
    expect(a / 1_000_000).toBeLessThan(12500);
  });

  it("polígono cerrado vs abierto: misma área", () => {
    const cerrado: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
    const abierto: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    expect(polygonArea(cerrado)).toBeCloseTo(polygonArea(abierto), 2);
  });
});

describe("formatMeters", () => {
  it("formatea centímetros si < 1m", () => {
    expect(formatMeters(0.5)).toBe("50 cm");
    expect(formatMeters(0.123)).toBe("12 cm");
  });
  it("formatea metros si < 1km", () => {
    expect(formatMeters(123)).toBe("123.0 m");
    expect(formatMeters(1.5)).toBe("1.5 m");
  });
  it("formatea km si >= 1km", () => {
    expect(formatMeters(1234)).toBe("1.234 km");
    expect(formatMeters(123456)).toBe("123.456 km");
  });
});

describe("formatHectares", () => {
  it("formatea m² si < 1 ha", () => {
    expect(formatHectares(5000)).toBe("5000 m²");
  });
  it("formatea ha si < 100 ha", () => {
    expect(formatHectares(50_000)).toBe("5.00 ha");
  });
  it("formatea ha con 1 decimal si >= 100 ha", () => {
    expect(formatHectares(1_500_000)).toBe("150.0 ha");
  });
});
