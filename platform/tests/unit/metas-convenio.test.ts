// =============================================================================
// Tests para src/lib/repos/metas-convenio.ts — fuente única de indicadores
//
// Desde la migración 36, el repo NO contiene patrones ILIKE: consume las
// vistas sgs_v_indicador_global / sgs_v_indicador_propuesta.
//
// Cubre:
//   1. getMetasConvenio mapea el global (incluye multiestrat y pct).
//   2. getPropuestasPorIndicador consulta la vista y mapea medida→km/ha.
//   3. key desconocida → [] sin consultar.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSql } = vi.hoisted(() => ({
  mockSql: Object.assign(vi.fn(), { unsafe: (s: string) => s, array: (v: unknown) => v }),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, sql: mockSql };
});

// `cached()` envuelve unstable_cache de Next; en tests es identidad.
vi.mock("@/lib/repos/_cache", () => ({
  cached: <T extends (...args: any[]) => any>(fn: T) => fn,
}));

import {
  getMetasConvenio,
  getPropuestasPorIndicador,
  INDICADORES_META,
  type IndicadorKey,
} from "@/lib/repos/metas-convenio";

type Row = Record<string, unknown>;

// Dispatcher: las queries del repo son tagged templates. Reconstruimos el SQL
// (sin los params) para elegir qué filas devolver.
function dispatch(handler: (query: string, values: unknown[]) => Row[]) {
  mockSql.mockImplementation((strings: unknown, ...values: unknown[]) => {
    const query = Array.isArray(strings) ? strings.join(" ") : String(strings);
    return Promise.resolve(handler(query, values));
  });
}

beforeEach(() => {
  mockSql.mockReset();
});

const GLOBAL_ROWS: Row[] = [
  { indicador_key: "cercos_vivos", actual: 6, unidad: "km" },
  { indicador_key: "alambre", actual: 12, unidad: "km" },
  { indicador_key: "multiestrat", actual: 1.5, unidad: "km" },
  { indicador_key: "conectividad", actual: 15, unidad: "km" },
  { indicador_key: "silvopastoril", actual: 7.5, unidad: "ha" },
  { indicador_key: "agroforestal", actual: 3, unidad: "ha" },
  { indicador_key: "cosecha", actual: 79, unidad: "obras" },
  { indicador_key: "compostaje", actual: 40, unidad: "kits" },
  { indicador_key: "estaciones", actual: 7, unidad: "estaciones" },
  { indicador_key: "obras_captacion", actual: 96, unidad: "obras" },
  { indicador_key: "predios_c3", actual: 39, unidad: "predios" },
];

describe("getMetasConvenio — consume la vista global (fuente única)", () => {
  it("mapea los 11 valores (10 oficiales + multiestrat) y calcula pct", async () => {
    dispatch((query) => {
      if (query.includes("sgs_v_indicador_global")) return GLOBAL_ROWS;
      if (query.includes("nombre_vereda AS nombre")) {
        return [{ id_vereda: 1, nombre: "V1", id_municipio: 1, nombre_municipio: "Guasca", num_propuestas: 5 }];
      }
      if (query.includes("nombre_municipio AS nombre")) {
        return [{ id_municipio: 1, nombre: "Guasca", num_propuestas: 5 }];
      }
      return [];
    });

    const out = await getMetasConvenio();

    expect(out.c1a1.indicadores).toHaveLength(3);
    expect(out.c1a1.indicadores[0]).toMatchObject({ label: "Cercos vivos", actual: 6, meta: 12, pct: 50 });
    expect(out.c1a1.indicadores[1]).toMatchObject({ actual: 12, pct: 100 });
    expect(out.c1a1.indicadores[2].actual).toBe(1.5); // multiestrat (extra)

    expect(out.c1a2.indicadores[0].pct).toBe(100); // 15/15
    expect(out.c1a2.indicadores[1].pct).toBe(50);  // 7.5/15
    expect(out.c2a1.indicadores[1].pct).toBe(51);  // 40/79 → 50.6 → 51
    expect(out.c2a2.indicadores[1]).toMatchObject({ actual: 96, pct: 200 });
    expect(out.c3.indicadores[0]).toMatchObject({ actual: 39, meta: 35, pct: 111 });

    expect(out.municipios_intervenidos).toHaveLength(1);
    expect(out.veredas_intervenidas).toHaveLength(1);

    // La query del global debe apuntar a la vista única
    const globalCall = mockSql.mock.calls.find((c) =>
      String((c[0] as string[]).join(" ")).includes("sgs_v_indicador_global"),
    );
    expect(globalCall).toBeDefined();
  });
});

describe("getPropuestasPorIndicador — consulta la vista única", () => {
  it("mapea medida→longitud_km para líneas", async () => {
    dispatch(() => [
      {
        id_propuesta: 42,
        actividad: "Cerco vivo",
        medida: 2.5,
        id_predio: 7,
        nombre_predio: "La Esperanza",
        nombre_municipio: "Guasca",
        nombre_vereda: "Vereda Alta",
      },
    ]);

    const out = await getPropuestasPorIndicador("cercos_vivos", 100);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id_propuesta: 42,
      actividad: "Cerco vivo",
      longitud_km: 2.5,
      hectareas: null,
    });

    const query = String((mockSql.mock.calls[0][0] as string[]).join(" "));
    expect(query).toContain("sgs_v_indicador_propuesta");
    expect(query).toContain("vp.indicador_key");
  });

  it("mapea medida→hectareas para polígonos", async () => {
    dispatch(() => [
      {
        id_propuesta: 5,
        actividad: "Sistema silvopastoril",
        medida: 3.2,
        id_predio: null,
        nombre_predio: null,
        nombre_municipio: null,
        nombre_vereda: null,
      },
    ]);
    const out = await getPropuestasPorIndicador("silvopastoril", 100);
    expect(out[0]).toMatchObject({ hectareas: 3.2, longitud_km: null });
  });

  it("key desconocida → [] sin consultar la BD", async () => {
    dispatch(() => []);
    const out = await getPropuestasPorIndicador("no_existe" as IndicadorKey, 100);
    expect(out).toEqual([]);
    expect(mockSql).not.toHaveBeenCalled();
  });
});

describe("INDICADORES_META — metadata de presentación", () => {
  it("ya no expone patterns (la definición vive en la vista SQL)", () => {
    for (const k of Object.keys(INDICADORES_META) as IndicadorKey[]) {
      expect(INDICADORES_META[k]).not.toHaveProperty("patterns");
      expect(INDICADORES_META[k].label.length).toBeGreaterThan(0);
      expect(INDICADORES_META[k].unidad.length).toBeGreaterThan(0);
    }
  });
});
