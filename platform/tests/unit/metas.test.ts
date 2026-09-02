// =============================================================================
// Tests unitarios para el repo de metas.
//
// Estrategia: como `getMetasResumen`, `getMetasGlobal` y
// `getMunicipiosIntervenidos` hacen SQL real (vistas de Postgres), mockeamos
// el helper `sql` para devolver filas controladas y verificar que el repo:
//   1. Mapea snake_case → camelCase correctamente.
//   2. Calcula `pct = min(100, current/meta * 100)` con 1 decimal.
//   3. Maneja meta=0 sin dividir por cero (devuelve 0%).
//   4. Cap el % a 100 cuando current > meta (sin perder el currentValue real,
//      para que la UI pueda mostrar "Meta superada").
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mockeamos `@/lib/db` para controlar las filas que devuelve `sql`.
// Mantenemos los helpers pgInt/pgNum/pgText reales (son funciones puras, no
// tocan BD), mockeando solo `sql`.
const mockSql = vi.fn();
vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, sql: (...args: unknown[]) => mockSql(...args) };
});

import {
  getMetasResumen,
  getMetasGlobal,
  getMunicipiosIntervenidos,
} from "@/lib/repos/metas";

beforeEach(() => {
  mockSql.mockReset();
});

describe("getMetasResumen", () => {
  it("mapea snake_case → camelCase y calcula pct con cap a 100", async () => {
    mockSql.mockResolvedValueOnce([
      {
        componente: "C1",
        accion: "A1",
        meta_key: "c1a1_cercos_vivos",
        meta_label: "Cercos vivos",
        meta_value: 12,
        meta_unit: "km",
        current_value: 6,
        current_unit: "km",
        count_propuestas: 2,
      },
      {
        // caso >100% — cap al 100 para la barra
        componente: "C1",
        accion: "A2",
        meta_key: "c1a2_silvopastoril",
        meta_label: "Silvopastoriles",
        meta_value: 15,
        meta_unit: "ha",
        current_value: 27.7, // 184.67% → cap 100
        current_unit: "ha",
        count_propuestas: 2,
      },
    ]);

    const out = await getMetasResumen();

    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      componente: "C1",
      accion: "A1",
      metaKey: "c1a1_cercos_vivos",
      metaLabel: "Cercos vivos",
      metaValue: 12,
      metaUnit: "km",
      currentValue: 6,
      currentUnit: "km",
      countPropuestas: 2,
      pct: 50, // 6/12 = 50.0%
    });
    expect(out[1]!.pct).toBe(100); // cap
    expect(out[1]!.currentValue).toBe(27.7); // sin cap (la UI muestra "Meta superada")
  });

  it("meta=0 → pct=0 (sin dividir por cero)", async () => {
    mockSql.mockResolvedValueOnce([
      {
        componente: "C2",
        accion: "A1",
        meta_key: "c2a1_cosecha_agua",
        meta_label: "Cosecha de agua",
        meta_value: 0, // meta 0 — caso edge
        meta_unit: "unidades",
        current_value: 0,
        current_unit: "unidades",
        count_propuestas: 0,
      },
    ]);
    const out = await getMetasResumen();
    expect(out[0]!.pct).toBe(0);
  });

  it("current=0 → pct=0", async () => {
    mockSql.mockResolvedValueOnce([
      {
        componente: "C3",
        accion: "A1",
        meta_key: "futura",
        meta_label: "Futura",
        meta_value: 35,
        meta_unit: "predios",
        current_value: 0,
        current_unit: "predios",
        count_propuestas: 0,
      },
    ]);
    const out = await getMetasResumen();
    expect(out[0]!.pct).toBe(0);
  });

  it("pct con 1 decimal (12.5%, no 12.5000001)", async () => {
    mockSql.mockResolvedValueOnce([
      {
        componente: "C1",
        accion: "A1",
        meta_key: "k",
        meta_label: "K",
        meta_value: 8,
        meta_unit: "km",
        current_value: 1, // 12.5%
        current_unit: "km",
        count_propuestas: 1,
      },
    ]);
    const out = await getMetasResumen();
    expect(out[0]!.pct).toBe(12.5);
  });

  it("retorna [] si la vista no tiene filas", async () => {
    mockSql.mockResolvedValueOnce([]);
    const out = await getMetasResumen();
    expect(out).toEqual([]);
  });
});

describe("getMetasGlobal", () => {
  it("mapea y calcula pct = sumCurrent / sumMeta", async () => {
    mockSql.mockResolvedValueOnce([
      {
        total_metas: 9,
        metas_cumplidas: 1,
        sum_current: 50,
        sum_meta: 200, // 25%
      },
    ]);
    const out = await getMetasGlobal();
    expect(out).toEqual({
      totalMetas: 9,
      metasCumplidas: 1,
      sumCurrent: 50,
      sumMeta: 200,
      pct: 25,
    });
  });

  it("sumMeta=0 → fallback seguro pct=0", async () => {
    mockSql.mockResolvedValueOnce([{ total_metas: 0, metas_cumplidas: 0, sum_current: 0, sum_meta: 0 }]);
    const out = await getMetasGlobal();
    expect(out.pct).toBe(0);
    expect(out.totalMetas).toBe(0);
  });

  it("sin filas → fallback (no throw)", async () => {
    mockSql.mockResolvedValueOnce([]);
    const out = await getMetasGlobal();
    expect(out).toEqual({
      totalMetas: 0,
      metasCumplidas: 0,
      sumCurrent: 0,
      sumMeta: 0,
      pct: 0,
    });
  });
});

describe("getMunicipiosIntervenidos", () => {
  it("mapea filas a camelCase", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id_municipio: 1,
        nombre_municipio: "Guasca",
        departamento: "Cundinamarca",
        num_propuestas: 5,
        num_predios: 3,
        num_veredas: 2,
      },
      {
        id_municipio: 2,
        nombre_municipio: "La Calera",
        departamento: "Cundinamarca",
        num_propuestas: 2,
        num_predios: 2,
        num_veredas: 1,
      },
    ]);
    const out = await getMunicipiosIntervenidos();
    expect(out).toEqual([
      {
        idMunicipio: 1,
        nombreMunicipio: "Guasca",
        departamento: "Cundinamarca",
        numPropuestas: 5,
        numPredios: 3,
        numVeredas: 2,
      },
      {
        idMunicipio: 2,
        nombreMunicipio: "La Calera",
        departamento: "Cundinamarca",
        numPropuestas: 2,
        numPredios: 2,
        numVeredas: 1,
      },
    ]);
  });

  it("retorna [] si no hay municipios con propuestas", async () => {
    mockSql.mockResolvedValueOnce([]);
    expect(await getMunicipiosIntervenidos()).toEqual([]);
  });
});
