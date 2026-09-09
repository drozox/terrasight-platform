// =============================================================================
// Tests para src/lib/repos/mvt.ts — whitelist + validaciones puras.
// La generación de tiles en sí (ST_AsMVT) requiere BD y se valida E2E.
// =============================================================================

import { describe, it, expect } from "vitest";
import { MVT_LAYERS, isMvtLayer } from "@/lib/repos/mvt";

describe("MVT_LAYERS whitelist", () => {
  it("contiene las 6 capas esperadas", () => {
    expect(MVT_LAYERS).toEqual([
      "predios",
      "vias",
      "drenajes",
      "propuestas",
      "municipios",
      "veredas",
    ]);
  });

  it("isMvtLayer acepta whitelisteados", () => {
    for (const layer of MVT_LAYERS) {
      expect(isMvtLayer(layer)).toBe(true);
    }
  });

  it("isMvtLayer rechaza capas no whitelisteadas", () => {
    expect(isMvtLayer("quebradas")).toBe(false);
    expect(isMvtLayer("")).toBe(false);
    expect(isMvtLayer("predios; DROP TABLE--")).toBe(false);
  });
});

describe("MVT tile coordinate validation (lógica de route)", () => {
  // Replicamos las validaciones que hace el route para poder testearlas
  // sin levantar el server.
  function validateTileCoords(z: number, x: number, y: number): { ok: true } | { error: string; status: number } {
    if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) {
      return { error: "Coordenadas inválidas", status: 400 };
    }
    if (z < 0 || z > 22) {
      return { error: "Coordenadas inválidas", status: 400 };
    }
    const maxCoord = (1 << z) - 1;
    if (x < 0 || x > maxCoord || y < 0 || y > maxCoord) {
      return { error: `Coordenadas fuera de rango para z=${z}`, status: 400 };
    }
    return { ok: true };
  }

  it("z=0 acepta solo (0,0)", () => {
    expect(validateTileCoords(0, 0, 0)).toEqual({ ok: true });
    expect(validateTileCoords(0, 1, 0)).toMatchObject({ status: 400 });
  });

  it("z=10 acepta 0..1023 en x/y", () => {
    expect(validateTileCoords(10, 0, 0)).toEqual({ ok: true });
    expect(validateTileCoords(10, 1023, 1023)).toEqual({ ok: true });
    expect(validateTileCoords(10, 1024, 0)).toMatchObject({ status: 400 });
    expect(validateTileCoords(10, -1, 0)).toMatchObject({ status: 400 });
  });

  it("z fuera de [0, 22] falla", () => {
    expect(validateTileCoords(23, 0, 0)).toMatchObject({ status: 400 });
    expect(validateTileCoords(-1, 0, 0)).toMatchObject({ status: 400 });
  });

  it("valores no enteros fallan", () => {
    expect(validateTileCoords(10, 100.5, 0)).toMatchObject({ status: 400 });
    expect(validateTileCoords(10, NaN, 0)).toMatchObject({ status: 400 });
    expect(validateTileCoords(10, Infinity, 0)).toMatchObject({ status: 400 });
  });
});
