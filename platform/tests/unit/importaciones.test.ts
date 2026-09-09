// =============================================================================
// Tests para src/lib/repos/importaciones.ts — validatePredioRow
// =============================================================================

import { describe, it, expect } from "vitest";
import { validatePredioRow } from "@/lib/repos/importaciones";

describe("validatePredioRow", () => {
  it("acepta fila completa válida", () => {
    const r = validatePredioRow(
      { nombre_predio: "Predio A", area_ha: "12.5", id_vereda: "5", id_propietario: "3" },
      2,
    );
    expect(r.errors).toEqual([]);
    expect(r.valid.nombre_predio).toBe("Predio A");
    expect(r.valid.area_ha).toBe(12.5);
    expect(r.valid.id_vereda).toBe(5);
  });

  it("rechaza fila sin nombre_predio", () => {
    const r = validatePredioRow({ nombre_predio: "", area_ha: "10" }, 2);
    expect(r.errors.some((e) => e.columna === "nombre_predio")).toBe(true);
  });

  it("rechaza area_ha negativo", () => {
    const r = validatePredioRow({ nombre_predio: "X", area_ha: "-5" }, 2);
    expect(r.errors.some((e) => e.columna === "area_ha")).toBe(true);
  });

  it("rechaza area_ha no numérico", () => {
    const r = validatePredioRow({ nombre_predio: "X", area_ha: "abc" }, 2);
    expect(r.errors.some((e) => e.columna === "area_ha")).toBe(true);
  });

  it("acepta area_ha con coma decimal (formato es-CO)", () => {
    const r = validatePredioRow({ nombre_predio: "X", area_ha: "12,5" }, 2);
    expect(r.errors).toEqual([]);
    expect(r.valid.area_ha).toBe(12.5);
  });

  it("rechaza id_vereda no entero positivo", () => {
    const r = validatePredioRow({ nombre_predio: "X", id_vereda: "abc" }, 2);
    expect(r.errors.some((e) => e.columna === "id_vereda")).toBe(true);
  });

  it("rechaza id_vereda negativo o cero", () => {
    expect(validatePredioRow({ nombre_predio: "X", id_vereda: "0" }, 2).errors.length).toBeGreaterThan(0);
    expect(validatePredioRow({ nombre_predio: "X", id_vereda: "-1" }, 2).errors.length).toBeGreaterThan(0);
  });

  it("acepta fila con solo nombre (FKs opcionales)", () => {
    const r = validatePredioRow({ nombre_predio: "Solo nombre" }, 2);
    expect(r.errors).toEqual([]);
    expect(r.valid.id_vereda).toBeNull();
    expect(r.valid.id_propietario).toBeNull();
  });

  it("rechaza id_propietario no numérico", () => {
    const r = validatePredioRow({ nombre_predio: "X", id_propietario: "abc" }, 2);
    expect(r.errors.some((e) => e.columna === "id_propietario")).toBe(true);
  });
});
