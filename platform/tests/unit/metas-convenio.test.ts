// =============================================================================
// Tests para src/lib/repos/metas-convenio.ts — drill-down de indicadores
//
// Cubre:
//   1. P1-3 — El filtro de acción usa "A1"/"A2" (substring(2,4)), NO "A"
//     (antes substring(2,3) daba "A" y matcheaba 0 filas)
//   2. P1-4 — globalSinFiltroCA=true omite el filtro de C/A para alinear
//     drill-down con el cálculo global (C2A2 estaciones/obras)
//   3. Mapeo snake_case → camelCase en PropuestaIndicador.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// `vi.mock` se hoistea al top del archivo, por lo que las refs de mocks
// deben declararse con `vi.hoisted` para que estén disponibles en la
// factory del mock.
const { mockSql } = vi.hoisted(() => ({
  // `unsafe` se usa para SQL dinámico (tabla/columna). Devuelve el string
  // tal cual, igual que postgres-js.
  mockSql: Object.assign(vi.fn(), { unsafe: (s: string) => s }),
}));

// Mockeamos `@/lib/db` para controlar las filas que devuelve `sql`.
// Mantenemos los helpers pgInt/pgNum/pgText reales (son funciones puras, no
// tocan BD), mockeando solo `sql`.
vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, sql: mockSql };
});

// Mock `next/cache` (vía el wrapper local) para que `cached()` pase como
// función identidad en tests. Sin esto, unstable_cache usa React's cache
// y rompe el mock de sql.
vi.mock("@/lib/repos/_cache", () => ({
  cached: <T extends (...args: any[]) => any>(fn: T) => fn,
}));

// Helper: una llamada a `sql\`SELECT...\`` retorna `mockReturnData`.
// Las llamadas previas a `sql\`c.nombre = ...\`` y `sql\`a.nombre = ...\`` no
// retornan nada (son fragmentos que se interpolan en el SELECT).
function setupMockResult(mockReturnData: unknown[] | unknown) {
  // Por defecto, las llamadas a sql`` no resuelven a nada útil. Solo la
  // llamada final al SELECT debe devolver datos. Usamos mockImplementation
  // que retorna mockReturnData si es la última llamada (la del SELECT grande).
  let callCount = 0;
  mockSql.mockImplementation(() => {
    callCount++;
    // Guardar el callCount en el mock para identificarlo después
    return Promise.resolve(mockReturnData);
  });
}

import {
  getPropuestasPorIndicador,
  INDICADORES_META,
  type IndicadorKey,
} from "@/lib/repos/metas-convenio";

beforeEach(() => {
  mockSql.mockReset();
});

describe("P1-3 — Drill-down usa A1/A2 (no 'A') en el filtro de acción", () => {
  it("cercos_vivos (ca='C1A1') filtra por a.nombre='A1', no por 'A'", async () => {
    setupMockResult([
      {
        id_propuesta: 1,
        actividad: "Cerco vivo",
        nombre_predio: "P1",
        nombre_municipio: "Guasca",
        nombre_vereda: "V1",
        medida: 1.5,
      },
    ]);

    const out = await getPropuestasPorIndicador("cercos_vivos", 100);
    expect(out).toHaveLength(1);

    // Buscar el filtro de acción entre las llamadas. Las llamadas a
    // `sql\`a.nombre = ${...}\`` reciben un array de strings + el valor.
    const allValues: unknown[] = [];
    for (const call of mockSql.mock.calls) {
      // Cada call es [strings, ...values] para tagged templates
      const values = call.slice(1);
      allValues.push(...values);
    }
    // P1-3: el filtro de acción debe usar "A1" (no "A")
    expect(allValues).toContain("A1");
    expect(allValues).toContain("C1");
    expect(allValues).not.toContain("A");
  });

  it("conectividad (ca='C1A2') filtra por a.nombre='A2'", async () => {
    setupMockResult([]);
    await getPropuestasPorIndicador("conectividad", 100);

    const allValues: unknown[] = [];
    for (const call of mockSql.mock.calls) {
      allValues.push(...call.slice(1));
    }
    expect(allValues).toContain("C1");
    expect(allValues).toContain("A2");
    expect(allValues).not.toContain("A");
  });

  it("cosecha (ca='C2A1') filtra por a.nombre='A1'", async () => {
    setupMockResult([]);
    await getPropuestasPorIndicador("cosecha", 100);

    const allValues: unknown[] = [];
    for (const call of mockSql.mock.calls) {
      allValues.push(...call.slice(1));
    }
    expect(allValues).toContain("C2");
    expect(allValues).toContain("A1");
  });
});

describe("P1-4 — globalSinFiltroCA=true omite el filtro C/A en el drill-down", () => {
  it("estaciones NO filtra por C/A en el drill-down (alinea con global)", async () => {
    setupMockResult([]);
    await getPropuestasPorIndicador("estaciones", 100);

    const allValues: unknown[] = [];
    for (const call of mockSql.mock.calls) {
      allValues.push(...call.slice(1));
    }
    // NO debe haber "C2" ni "A2" en los valores — el filtro C/A está omitido
    expect(allValues).not.toContain("C2");
    expect(allValues).not.toContain("A2");
  });

  it("obras_captacion NO filtra por C/A en el drill-down", async () => {
    setupMockResult([]);
    await getPropuestasPorIndicador("obras_captacion", 100);

    const allValues: unknown[] = [];
    for (const call of mockSql.mock.calls) {
      allValues.push(...call.slice(1));
    }
    expect(allValues).not.toContain("C2");
    expect(allValues).not.toContain("A2");
  });

  it("INDICADORES_META.estaciones expone globalSinFiltroCA=true", () => {
    expect(INDICADORES_META.estaciones.globalSinFiltroCA).toBe(true);
    expect(INDICADORES_META.obras_captacion.globalSinFiltroCA).toBe(true);
  });

  it("indicadores que NO son globales sí filtran por C/A", () => {
    // cerco_vivos, conectividad, etc. deben tener globalSinFiltroCA=false o undefined
    const filteredKeys: IndicadorKey[] = [
      "cercos_vivos",
      "alambre",
      "conectividad",
      "silvopastoril",
      "agroforestal",
      "cosecha",
      "compostaje",
    ];
    for (const k of filteredKeys) {
      expect(INDICADORES_META[k].globalSinFiltroCA).not.toBe(true);
    }
  });
});

describe("Mapeo snake_case → camelCase en PropuestaIndicador", () => {
  it("mapea correctamente los campos de la fila (kind=lineas → longitud_km)", async () => {
    setupMockResult([
      {
        id_propuesta: 42,
        actividad: "Cerco vivo",
        nombre_predio: "La Esperanza",
        nombre_municipio: "Guasca",
        nombre_vereda: "Vereda Alta",
        medida: 2.5,
      },
    ]);

    const out = await getPropuestasPorIndicador("cercos_vivos", 100);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id_propuesta: 42,
      actividad: "Cerco vivo",
      nombre_predio: "La Esperanza",
      nombre_municipio: "Guasca",
      nombre_vereda: "Vereda Alta",
      longitud_km: 2.5, // kind=lineas → longitud_km
      hectareas: null, // kind=lineas → hectareas=null
    });
  });

  it("maneja campos opcionales null", async () => {
    setupMockResult([
      {
        id_propuesta: 1,
        actividad: "Punto sin predio",
        nombre_predio: null,
        nombre_municipio: null,
        nombre_vereda: null,
        medida: null,
      },
    ]);

    const out = await getPropuestasPorIndicador("cosecha", 100);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id_propuesta: 1,
      nombre_predio: null,
      nombre_municipio: null,
      nombre_vereda: null,
    });
  });
});
