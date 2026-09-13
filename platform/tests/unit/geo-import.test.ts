// =============================================================================
// Tests para src/lib/geo-import.ts — funciones puras
//
// Cobertura (characterization tests — refleja lo que la función HACE hoy):
//   - parseGeoJSON           — string → FeatureCollection
//   - formatAreaHa           — number? → string
//   - formatLongitudM        — number? → string
//   - formatBbox             — bbox | null → string
//   - buildResumenImportacion — FC → ResumenImportacion
//   - toImportPayload        — ResumenImportacion + fuente → ImportPayload
//
// NO se testean acá:
//   - parseShapefile, parseArchivoCapas — dependen de DOM File
// =============================================================================

import { describe, it, expect } from "vitest";
import type { Feature, FeatureCollection } from "geojson";
import {
  parseGeoJSON,
  formatAreaHa,
  formatLongitudM,
  formatBbox,
  buildResumenImportacion,
  toImportPayload,
} from "@/lib/geo-import";

const fcPoint: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { actividad: "Cerco vivo", componente: "C1", accion: "A1" },
      geometry: { type: "Point", coordinates: [-74.1, 4.6] },
    },
  ],
};

describe("parseGeoJSON — string → FeatureCollection", () => {
  it("acepta un FeatureCollection válido", () => {
    const text = JSON.stringify(fcPoint);
    const out = parseGeoJSON(text);
    expect(out.type).toBe("FeatureCollection");
    expect(out.features).toHaveLength(1);
    expect(out.features[0].geometry.type).toBe("Point");
  });

  it("acepta un Feature suelto y lo envuelve como FeatureCollection", () => {
    const text = JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [0, 0] },
    });
    const out = parseGeoJSON(text);
    expect(out.type).toBe("FeatureCollection");
    expect(out.features).toHaveLength(1);
  });

  it("lanza con texto inválido (no es JSON)", () => {
    expect(() => parseGeoJSON("esto no es json")).toThrow();
  });

  it("lanza cuando type !== 'FeatureCollection' ni 'Feature'", () => {
    const text = JSON.stringify({ type: "GeometryCollection", geometries: [] });
    expect(() => parseGeoJSON(text)).toThrow(/GeoJSON inválido/);
  });

  it("lanza cuando falta el array 'features' en FeatureCollection", () => {
    const text = JSON.stringify({ type: "FeatureCollection" });
    expect(() => parseGeoJSON(text)).toThrow(/features/);
  });
});

describe("formatAreaHa — formato UI de áreas en ha", () => {
  it("undefined → '—'", () => {
    expect(formatAreaHa(undefined)).toBe("—");
  });

  it("área < 0.01 ha → m² (ej. 0.005 ha = 50 m²)", () => {
    expect(formatAreaHa(0.005)).toMatch(/m²/);
    expect(formatAreaHa(0.005)).toContain("50");
  });

  it("área < 1 ha → m² (sin decimales)", () => {
    expect(formatAreaHa(0.5)).toMatch(/m²$/);
    expect(formatAreaHa(0.5)).toContain("5000");
  });

  it("área >= 1 ha → 'X.XX ha' con 2 decimales", () => {
    expect(formatAreaHa(12.5)).toBe("12.50 ha");
    expect(formatAreaHa(1)).toBe("1.00 ha");
  });
});

describe("formatLongitudM — formato UI de longitudes en m", () => {
  it("undefined → '—'", () => {
    expect(formatLongitudM(undefined)).toBe("—");
  });

  it("longitud < 1000 m → 'X.XX m'", () => {
    expect(formatLongitudM(100)).toBe("100.00 m");
    expect(formatLongitudM(0.5)).toBe("0.50 m");
  });

  it("longitud >= 1000 m → 'X.XX km'", () => {
    expect(formatLongitudM(1000)).toBe("1.00 km");
    expect(formatLongitudM(5500)).toBe("5.50 km");
  });
});

describe("formatBbox — formato UI de bbox", () => {
  it("null → '—'", () => {
    expect(formatBbox(null)).toBe("—");
  });

  it("bbox válida → 'minX, minY → maxX, maxY' con 4 decimales", () => {
    expect(formatBbox([-74.1, 4.5, -73.9, 5.0])).toBe(
      "-74.1000, 4.5000 → -73.9000, 5.0000",
    );
  });
});

describe("buildResumenImportacion — FC → ResumenImportacion", () => {
  it("FeatureCollection de 1 feature Point → resumen con total=1, puntos=1, lineas=0, poligonos=0", () => {
    const r = buildResumenImportacion(fcPoint);
    expect(r.total).toBe(1);
    expect(r.puntos).toBe(1);
    expect(r.lineas).toBe(0);
    expect(r.poligonos).toBe(0);
    expect(r.propuestas).toHaveLength(1);
    expect(r.advertencias).toEqual([]);
    expect(r.bbox).not.toBeNull();
    // El bbox del point único es [x, y, x, y]
    expect(r.bbox).toEqual([-74.1, 4.6, -74.1, 4.6]);
  });

  it("FC con mix de Point, LineString y Polygon → conteos correctos", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [0, 0] } },
        {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [[0, 0], [0, 1]] },
        },
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          },
        },
      ],
    };
    const r = buildResumenImportacion(fc);
    expect(r.total).toBe(3);
    expect(r.puntos).toBe(1);
    expect(r.lineas).toBe(1);
    expect(r.poligonos).toBe(1);
    expect(r.advertencias).toHaveLength(0);
  });

  it("FC vacío → resumen vacío (total=0, sin bbox)", () => {
    const fc: FeatureCollection = { type: "FeatureCollection", features: [] };
    const r = buildResumenImportacion(fc);
    expect(r.total).toBe(0);
    expect(r.puntos).toBe(0);
    expect(r.lineas).toBe(0);
    expect(r.poligonos).toBe(0);
    expect(r.propuestas).toEqual([]);
    expect(r.bbox).toBeNull();
  });

  it("feature sin geometría → descartada con advertencia, no lanza", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {}, geometry: null as unknown as Feature["geometry"] },
      ],
    };
    const r = buildResumenImportacion(fc);
    expect(r.total).toBe(0);
    expect(r.propuestas).toHaveLength(0);
    expect(r.advertencias.length).toBeGreaterThan(0);
    expect(r.advertencias[0]).toMatch(/sin geometr/);
  });
});

describe("toImportPayload — Resumen + fuente → ImportPayload", () => {
  it("envuelve propuesta y conserva total/bbox/items", () => {
    const r = buildResumenImportacion(fcPoint);
    const payload = toImportPayload(r, "user-upload.geojson");
    expect(payload.fuente).toBe("user-upload.geojson");
    expect(payload.total).toBe(1);
    expect(payload.bbox).toEqual(r.bbox);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].tipo).toBe("punto");
    expect(payload.items[0].actividad).toBe("Cerco vivo");
  });
});
