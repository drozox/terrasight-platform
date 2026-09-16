// =============================================================================
// metas-convenio.ts — Indicadores del convenio CAR-WWF-Fundación Natura
//
// FUENTE ÚNICA DE VERDAD (DEEPSEEK-F4 — migración 40):
//   Los 10 indicadores se calculan en la vista SQL `sgs_v_indicador_global`,
//   que a su vez deriva de `sgs_v_indicador_propuesta` (migración 40).
//   Esta versión usa `id_accion` (JOIN con sgs_com_accion) + actividad
//   ESPECÍFICA en lugar de fuzzy-match permisivo. La lista de actividades
//   aceptadas está en la migración 40.
//
//   - Global      → sgs_v_indicador_global
//   - Drill-down  → sgs_v_indicador_propuesta WHERE indicador_key = ?
//   - Municipio   → sgs_v_indicador_propuesta JOIN (propuestas del municipio)
//
// Targets (spec de Nikoll + DEEPSEEK-F4):
//   C1A1: 12 km cercos vivos + 12 km aislamientos (cerco de alambre)
//   C1A2: 15 ha conectividad + 15 ha silvopastoriles + 15 ha agroforestales
//   C2A1: 79 cosecha de agua + 79 compostaje
//   C2A2: 7 estaciones limnimétricas + 48 obras de captación (suma TODAS C2A2+C3)
//   C3AU: 35 predios en áreas protegidas (count distinct id_predio)
//
// Mapeo GDB-id → BD-nombre_accion (DEEPSEEK-F4 feedback):
//   C1A1 → A1  (GDB 2040201) · C1A2 → A2  (GDB 2040202)
//   C2A1 → A1  (GDB 2040203) · C2A2 → A2  (GDB 2040204)
//   C3AU → U   (GDB 2040205) ← acción "U" creada en migración 41
// =============================================================================

import { sql, pgInt, pgNum, pgText } from "../db";
import { cached } from "./_cache";
import type { FeatureCollection, Geometry } from "geojson";

export interface MetaIndicador {
  label: string;
  actual: number;
  meta: number;
  unidad: string;
  pct: number;  // 0..100+ (puede pasar de 100)
}

export interface MetaComponente {
  componente: string;
  accion: string;
  descripcion: string;
  indicadores: MetaIndicador[];
}

export interface MetasConvenio {
  c1a1: MetaComponente;
  c1a2: MetaComponente;
  c2a1: MetaComponente;
  c2a2: MetaComponente;
  c3: MetaComponente;
  municipios_intervenidos: { id_municipio: number; nombre: string; num_propuestas: number }[];
  veredas_intervenidas: { id_vereda: number; nombre: string; id_municipio: number; nombre_municipio: string; num_propuestas: number }[];
}

export interface DetalleMunicipio {
  municipio: { id_municipio: number; nombre: string };
  indicadores: { label: string; actual: number; meta: number; unidad: string; pct: number }[];
  veredas: { id_vereda: number; nombre: string; num_propuestas: number }[];
  propuestas_por_componente: { componente: string; accion: string; n: number }[];
}

// =============================================================================
// Metadata de los 10 indicadores (presentación + drill-down).
//
// NO contiene patrones de match: la definición vive en la vista SQL (migración
// 36). `kind` se usa para mapear `medida` → hectáreas/longitud_km en el
// drill-down y para decidir si el drill-down aplica (super = C3).
// =============================================================================
export type IndicadorKey =
  | "cercos_vivos"
  | "alambre"
  | "conectividad"
  | "silvopastoril"
  | "agroforestal"
  | "cosecha"
  | "compostaje"
  | "estaciones"
  | "obras_captacion"
  | "predios_c3";

export interface IndicadorMeta {
  key: IndicadorKey;
  label: string;
  ca: "C1A1" | "C1A2" | "C2A1" | "C2A2" | "C3";
  kind: "lineas" | "poligonos" | "puntos" | "super";
  meta: number;
  unidad: string;
}

export const INDICADORES_META: Record<IndicadorKey, IndicadorMeta> = {
  cercos_vivos: { key: "cercos_vivos", label: "Cercos vivos", ca: "C1A1", kind: "lineas", meta: 12, unidad: "km" },
  alambre: { key: "alambre", label: "Aislamientos (cerco de alambre)", ca: "C1A1", kind: "lineas", meta: 12, unidad: "km" },
  conectividad: { key: "conectividad", label: "Franjas de conectividad", ca: "C1A2", kind: "lineas", meta: 15, unidad: "km" },
  silvopastoril: { key: "silvopastoril", label: "Sistemas silvopastoriles", ca: "C1A2", kind: "poligonos", meta: 15, unidad: "ha" },
  agroforestal: { key: "agroforestal", label: "Sistemas agroforestales", ca: "C1A2", kind: "poligonos", meta: 15, unidad: "ha" },
  cosecha: { key: "cosecha", label: "Cosecha de agua", ca: "C2A1", kind: "puntos", meta: 79, unidad: "obras" },
  compostaje: { key: "compostaje", label: "Kit de compostaje", ca: "C2A1", kind: "puntos", meta: 79, unidad: "kits" },
  estaciones: { key: "estaciones", label: "Estaciones limnimétricas", ca: "C2A2", kind: "puntos", meta: 7, unidad: "estaciones" },
  obras_captacion: { key: "obras_captacion", label: "Obras de captación", ca: "C2A2", kind: "puntos", meta: 48, unidad: "obras" },
  predios_c3: { key: "predios_c3", label: "Predios intervenidos en áreas protegidas", ca: "C3", kind: "super", meta: 35, unidad: "predios" },
};

export interface PropuestaIndicador {
  id_propuesta: number;
  actividad: string;
  nombre_predio: string | null;
  nombre_municipio: string | null;
  nombre_vereda: string | null;
  hectareas: number | null;
  longitud_km: number | null;
}

// =============================================================================
// Indicadores globales — 1 query a la vista agregada.
// Devuelve un mapa key → actual (incluye `multiestrat`, que no es uno de los
// 10 indicadores oficiales pero se muestra como fila extra en C1A1).
// =============================================================================
type GlobalIndicadores = Record<string, number>;

async function getGlobalIndicadores(): Promise<GlobalIndicadores> {
  const rows = await sql<{ indicador_key: string; actual: number | string }[]>`
    SELECT indicador_key, actual
    FROM   sgs_v_indicador_global;
  `;
  const out: GlobalIndicadores = {};
  for (const r of rows) out[pgText(r.indicador_key)] = pgNum(r.actual);
  return out;
}

// =============================================================================
// Drill-down: propuestas que componen un indicador (desde la vista única).
// =============================================================================
const getPropuestasPorIndicadorImpl = async (
  key: IndicadorKey,
  limit: number = 100,
): Promise<PropuestaIndicador[]> => {
  const meta: IndicadorMeta | undefined = INDICADORES_META[key];
  if (!meta) return [];
  try {
    const rows = await sql<{
      id_propuesta: number | string;
      actividad: string | null;
      medida: number | string | null;
      id_predio: number | string | null;
      nombre_predio: string | null;
      nombre_municipio: string | null;
      nombre_vereda: string | null;
    }[]>`
      SELECT
        vp.id_propuesta,
        vp.actividad,
        vp.medida,
        vp.id_predio,
        pr.nombre_predio,
        m.nombre_municipio,
        ve.nombre_vereda
      FROM   sgs_v_indicador_propuesta vp
      LEFT JOIN sgs_pre_predio     pr ON pr.id_predio   = vp.id_predio
      LEFT JOIN bcs_lpa_vereda     ve ON ve.id_vereda   = pr.id_vereda
      LEFT JOIN bcs_lpa_municipio  m  ON m.id_municipio = ve.id_municipio
      WHERE  vp.indicador_key = ${key}
      ORDER BY vp.id_propuesta
      LIMIT  ${limit};
    `;
    return rows.map((r) => ({
      id_propuesta: pgInt(r.id_propuesta),
      actividad: r.actividad ? pgText(r.actividad) : "—",
      nombre_predio: r.nombre_predio ? pgText(r.nombre_predio) : null,
      nombre_municipio: r.nombre_municipio ? pgText(r.nombre_municipio) : null,
      nombre_vereda: r.nombre_vereda ? pgText(r.nombre_vereda) : null,
      hectareas: meta.kind === "poligonos" && r.medida != null ? pgNum(r.medida) : null,
      longitud_km: meta.kind === "lineas" && r.medida != null ? pgNum(r.medida) : null,
    }));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[terrasight] getPropuestasPorIndicador(${key}) failed:`, (err as Error).message);
    }
    return [];
  }
};
export const getPropuestasPorIndicador = cached(getPropuestasPorIndicadorImpl, {
  tags: ["metas", "convenio", "propuestas"],
  ttl: 60,
});

// =============================================================================
// getIndicadorGeoJSON — geometría de las propuestas que contribuyen a un
// indicador, reproyectada a 4326, para el mapa del drill-down.
//   - lineas:      sgs_pro_propuesta_linea
//   - poligonos:   sgs_pro_propuesta_poligono
//   - puntos:      sgs_pro_propuesta_punto
//   - super (C3):  polígonos de los PREDIOS distintos (no las 405 propuestas)
// Las geometrías están en SRID 4686; se transforman a 4326 (CASE por si vinieran
// ya en 4326).
// =============================================================================
type GeoRow = { id: number | string; nombre: string | null; actividad: string | null; medida: number | string | null; geom: string };

async function getIndicadorGeoJSONImpl(key: IndicadorKey): Promise<FeatureCollection> {
  const meta: IndicadorMeta | undefined = INDICADORES_META[key];
  if (!meta) return { type: "FeatureCollection", features: [] };

  let rows: GeoRow[];
  if (meta.kind === "super") {
    rows = await sql<GeoRow[]>`
      SELECT DISTINCT vp.id_predio AS id, pr.nombre_predio AS nombre, NULL::text AS actividad,
             NULL::numeric AS medida,
             ST_AsGeoJSON(CASE WHEN ST_SRID(pr.geom) = 4326 THEN pr.geom ELSE ST_Transform(pr.geom, 4326) END) AS geom
      FROM   sgs_v_indicador_propuesta vp
      JOIN   sgs_pre_predio pr ON pr.id_predio = vp.id_predio
      WHERE  vp.indicador_key = ${key} AND vp.id_predio IS NOT NULL AND pr.geom IS NOT NULL;
    `;
  } else if (meta.kind === "lineas") {
    rows = await sql<GeoRow[]>`
      SELECT DISTINCT vp.id_propuesta AS id, NULL::text AS nombre, ch.actividad, vp.medida,
             ST_AsGeoJSON(CASE WHEN ST_SRID(ch.geom) = 4326 THEN ch.geom ELSE ST_Transform(ch.geom, 4326) END) AS geom
      FROM   sgs_v_indicador_propuesta vp
      JOIN   sgs_pro_propuesta_linea ch ON ch.id_propuesta = vp.id_propuesta
      WHERE  vp.indicador_key = ${key} AND ch.geom IS NOT NULL;
    `;
  } else if (meta.kind === "poligonos") {
    rows = await sql<GeoRow[]>`
      SELECT DISTINCT vp.id_propuesta AS id, NULL::text AS nombre, ch.actividad, vp.medida,
             ST_AsGeoJSON(CASE WHEN ST_SRID(ch.geom) = 4326 THEN ch.geom ELSE ST_Transform(ch.geom, 4326) END) AS geom
      FROM   sgs_v_indicador_propuesta vp
      JOIN   sgs_pro_propuesta_poligono ch ON ch.id_propuesta = vp.id_propuesta
      WHERE  vp.indicador_key = ${key} AND ch.geom IS NOT NULL;
    `;
  } else {
    rows = await sql<GeoRow[]>`
      SELECT DISTINCT vp.id_propuesta AS id, NULL::text AS nombre, ch.actividad, vp.medida,
             ST_AsGeoJSON(CASE WHEN ST_SRID(ch.geom) = 4326 THEN ch.geom ELSE ST_Transform(ch.geom, 4326) END) AS geom
      FROM   sgs_v_indicador_propuesta vp
      JOIN   sgs_pro_propuesta_punto ch ON ch.id_propuesta = vp.id_propuesta
      WHERE  vp.indicador_key = ${key} AND ch.geom IS NOT NULL;
    `;
  }

  return {
    type: "FeatureCollection",
    features: rows.map((r) => ({
      type: "Feature",
      properties: {
        id: pgInt(r.id),
        nombre: r.nombre == null ? null : pgText(r.nombre),
        actividad: r.actividad == null ? null : pgText(r.actividad),
        medida: r.medida == null ? null : pgNum(r.medida),
        unidad: meta.unidad,
        layer: key,
      },
      geometry: JSON.parse(r.geom) as Geometry,
    })),
  };
}
export const getIndicadorGeoJSON = cached(getIndicadorGeoJSONImpl, {
  tags: ["metas", "convenio", "propuestas", "mapa"],
  ttl: 60,
});

// =============================================================================
// Builders de MetaComponente a partir del mapa global.
// =============================================================================
function mk(label: string, actual: number, meta: number, unidad: string): MetaIndicador {
  return { label, actual, meta, unidad, pct: pct(actual, meta) };
}

function getC1A1(g: GlobalIndicadores): MetaComponente {
  const cerVivos = g.cercos_vivos ?? 0;
  const alambre = g.alambre ?? 0;
  return {
    componente: "C1",
    accion: "A1",
    descripcion: "Conservación del Recurso Hídrico a través de Medidas de Adaptación al Cambio Climático",
    indicadores: [
      mk("Cercos vivos", cerVivos, 12, "km"),
      mk("Aislamientos (cerco de alambre)", alambre, 12, "km"),
    ],
  };
}

function getC1A2(g: GlobalIndicadores): MetaComponente {
  return {
    componente: "C1",
    accion: "A2",
    descripcion: "Conectividad y reconversión agroforestal",
    indicadores: [
      mk("Franjas de conectividad", g.conectividad ?? 0, 15, "km"),
      mk("Sistemas silvopastoriles", g.silvopastoril ?? 0, 15, "ha"),
      mk("Sistemas agroforestales", g.agroforestal ?? 0, 15, "ha"),
    ],
  };
}

function getC2A1(g: GlobalIndicadores): MetaComponente {
  return {
    componente: "C2",
    accion: "A1",
    descripcion: "Manejo del Ciclo del Agua y Restauración de Suelos",
    indicadores: [
      mk("Cosecha de agua", g.cosecha ?? 0, 79, "obras"),
      mk("Kit de compostaje", g.compostaje ?? 0, 79, "kits"),
    ],
  };
}

function getC2A2(g: GlobalIndicadores): MetaComponente {
  return {
    componente: "C2",
    accion: "A2",
    descripcion: "Estaciones limnimétricas y obras de captación",
    indicadores: [
      mk("Estaciones limnimétricas", g.estaciones ?? 0, 7, "estaciones"),
      mk("Obras de captación", g.obras_captacion ?? 0, 48, "obras"),
    ],
  };
}

function getC3(g: GlobalIndicadores): MetaComponente {
  return {
    componente: "C3",
    accion: "AU",
    descripcion: "Reconversión Productiva en Áreas Protegidas y Páramos",
    indicadores: [
      mk("Predios intervenidos en áreas protegidas", g.predios_c3 ?? 0, 35, "predios"),
    ],
  };
}

// =============================================================================
// Indicadores planos (key → { actual, meta, pct, cumplida })
//
// Usado por el versionado/snapshots (Sprint 22) y disponible para cualquier
// consumidor que necesite los 10 indicadores sin la agrupación por C-A.
// Deriva de la MISMA vista única.
// =============================================================================
export interface IndicadorPlano {
  actual: number;
  meta: number;
  pct: number;
  cumplida: boolean;
}

export async function getIndicadoresFlat(): Promise<Record<IndicadorKey, IndicadorPlano>> {
  const g = await getGlobalIndicadores();
  const out = {} as Record<IndicadorKey, IndicadorPlano>;
  for (const k of Object.keys(INDICADORES_META) as IndicadorKey[]) {
    const meta = INDICADORES_META[k];
    const actual = g[k] ?? 0;
    out[k] = {
      actual,
      meta: meta.meta,
      pct: pct(actual, meta.meta),
      cumplida: actual >= meta.meta,
    };
  }
  return out;
}

// =============================================================================
// Municipios y veredas intervenidos
//
// Cubre:
//   1) Propuestas con id_predio → municipio/vereda del predio (lookup)
//   2) Propuestas con geom (líneas/polígonos) → intersección espacial
//   3) Puntos sin geom ni id_predio (C2 obras) → excluidos del detalle geográfico
// =============================================================================
async function getMunicipiosIntervenidos() {
  return sql<{ id_municipio: number; nombre: string; num_propuestas: number }[]>`
    WITH propuestas_geo AS (
      SELECT DISTINCT pp.id_propuesta, m.id_municipio, m.nombre_municipio
      FROM sgs_pro_propuesta pp
      JOIN sgs_pre_predio p ON p.id_predio = pp.id_predio
      JOIN bcs_lpa_vereda v ON v.id_vereda = p.id_vereda
      JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
      WHERE pp.id_predio IS NOT NULL
      UNION
      SELECT DISTINCT pp.id_propuesta, m.id_municipio, m.nombre_municipio
      FROM sgs_pro_propuesta_linea pl
      JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
      JOIN bcs_lpa_municipio m ON ST_Intersects(m.geom, pl.geom)
      UNION
      SELECT DISTINCT pp.id_propuesta, m.id_municipio, m.nombre_municipio
      FROM sgs_pro_propuesta_poligono pq
      JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
      JOIN bcs_lpa_municipio m ON ST_Intersects(m.geom, pq.geom)
    )
    SELECT id_municipio, nombre_municipio AS nombre, count(DISTINCT id_propuesta)::int AS num_propuestas
    FROM propuestas_geo
    GROUP BY id_municipio, nombre_municipio
    ORDER BY num_propuestas DESC, nombre_municipio
  `;
}

async function getVeredasIntervenidas() {
  return sql<{ id_vereda: number; nombre: string; id_municipio: number; nombre_municipio: string; num_propuestas: number }[]>`
    WITH propuestas_geo AS (
      SELECT DISTINCT pp.id_propuesta, v.id_vereda, v.nombre_vereda, m.id_municipio, m.nombre_municipio
      FROM sgs_pro_propuesta pp
      JOIN sgs_pre_predio p ON p.id_predio = pp.id_predio
      JOIN bcs_lpa_vereda v ON v.id_vereda = p.id_vereda
      JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
      WHERE pp.id_predio IS NOT NULL
      UNION
      SELECT DISTINCT pp.id_propuesta, v.id_vereda, v.nombre_vereda, m.id_municipio, m.nombre_municipio
      FROM sgs_pro_propuesta_linea pl
      JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
      JOIN bcs_lpa_vereda v ON ST_Intersects(v.geom, pl.geom)
      JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
      UNION
      SELECT DISTINCT pp.id_propuesta, v.id_vereda, v.nombre_vereda, m.id_municipio, m.nombre_municipio
      FROM sgs_pro_propuesta_poligono pq
      JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
      JOIN bcs_lpa_vereda v ON ST_Intersects(v.geom, pq.geom)
      JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
    )
    SELECT id_vereda, nombre_vereda AS nombre, id_municipio, nombre_municipio, count(DISTINCT id_propuesta)::int AS num_propuestas
    FROM propuestas_geo
    GROUP BY id_vereda, nombre_vereda, id_municipio, nombre_municipio
    ORDER BY num_propuestas DESC, nombre_municipio, nombre_vereda
  `;
}

// =============================================================================
// Helper
// =============================================================================
function pct(actual: number, meta: number): number {
  if (meta <= 0) return 0;
  return Math.round((actual / meta) * 100);
}

// =============================================================================
// Public API
// =============================================================================
const getMetasConvenioImpl = async (): Promise<MetasConvenio> => {
  const [g, municipios, veredas] = await Promise.all([
    getGlobalIndicadores(),
    getMunicipiosIntervenidos(),
    getVeredasIntervenidas(),
  ]);
  return {
    c1a1: getC1A1(g),
    c1a2: getC1A2(g),
    c2a1: getC2A1(g),
    c2a2: getC2A2(g),
    c3: getC3(g),
    municipios_intervenidos: municipios.map((r) => ({
      id_municipio: pgInt(r.id_municipio),
      nombre: pgText(r.nombre),
      num_propuestas: pgInt(r.num_propuestas),
    })),
    veredas_intervenidas: veredas.map((r) => ({
      id_vereda: pgInt(r.id_vereda),
      nombre: pgText(r.nombre),
      id_municipio: pgInt(r.id_municipio),
      nombre_municipio: pgText(r.nombre_municipio),
      num_propuestas: pgInt(r.num_propuestas),
    })),
  };
};
export const getMetasConvenio = cached(getMetasConvenioImpl, {
  tags: ["metas", "convenio"],
  ttl: 60,
});

// =============================================================================
// Detalle por municipio: drill-down desde /metas/convenio/[id_municipio]
//
// Los indicadores se calculan sobre la MISMA vista única filtrando las
// propuestas que tocan el municipio — garantiza global == municipio.
// =============================================================================
const ORDEN_DETALLE: IndicadorKey[] = [
  "cercos_vivos", "alambre", "conectividad", "silvopastoril", "agroforestal",
  "cosecha", "compostaje", "estaciones", "obras_captacion", "predios_c3",
];

export const getDetalleMunicipio = cached(
  async (idMunicipio: number): Promise<DetalleMunicipio | null> => {
    // 1) Metadatos del municipio
    const muniRows = await sql<{ id_municipio: number; nombre: string }[]>`
      SELECT id_municipio, nombre_municipio AS nombre
      FROM bcs_lpa_municipio
      WHERE id_municipio = ${idMunicipio}
    `;
    if (muniRows.length === 0) return null;
    const municipio = {
      id_municipio: pgInt(muniRows[0].id_municipio),
      nombre: pgText(muniRows[0].nombre),
    };

    // 2) Propuestas que tocan el municipio (predio→vereda, o intersección espacial)
    const idsResult = await sql<{ id_propuesta: number }[]>`
      WITH propuestas_municipio AS (
        SELECT DISTINCT pp.id_propuesta
        FROM sgs_pro_propuesta pp
        JOIN sgs_pre_predio p ON p.id_predio = pp.id_predio
        JOIN bcs_lpa_vereda v ON v.id_vereda = p.id_vereda
        WHERE v.id_municipio = ${idMunicipio}
        UNION
        SELECT DISTINCT pp.id_propuesta
        FROM sgs_pro_propuesta_linea pl
        JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
        JOIN bcs_lpa_municipio m ON m.id_municipio = ${idMunicipio} AND ST_Intersects(m.geom, pl.geom)
        UNION
        SELECT DISTINCT pp.id_propuesta
        FROM sgs_pro_propuesta_poligono pq
        JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
        JOIN bcs_lpa_municipio m ON m.id_municipio = ${idMunicipio} AND ST_Intersects(m.geom, pq.geom)
      )
      SELECT id_propuesta FROM propuestas_municipio
    `;
    const propIds: number[] = idsResult.map((r) => Number(r.id_propuesta)).filter((n) => Number.isFinite(n));
    if (propIds.length === 0) {
      return { municipio, indicadores: [], veredas: [], propuestas_por_componente: [] };
    }

    // 3) Indicadores del municipio — MISMA vista que el global.
    const indRows = await sql<{ indicador_key: string; actual: number | string }[]>`
      WITH prop_muni AS (
        SELECT id_propuesta FROM unnest(${sql.array(propIds, 23)}) AS id_propuesta
      )
      SELECT vp.indicador_key,
             CASE
               WHEN max(vp.agregacion) = 'count_distinct_predio'
                 THEN count(DISTINCT vp.id_predio)::numeric
               ELSE COALESCE(SUM(vp.medida), 0)::numeric
             END AS actual
      FROM sgs_v_indicador_propuesta vp
      JOIN prop_muni pm ON pm.id_propuesta = vp.id_propuesta
      GROUP BY vp.indicador_key
    `;
    const actualPorKey: Record<string, number> = {};
    for (const row of indRows) actualPorKey[pgText(row.indicador_key)] = pgNum(row.actual);
    const indicadores: DetalleMunicipio["indicadores"] = ORDEN_DETALLE.map((k) => {
      const meta = INDICADORES_META[k];
      const actual = actualPorKey[k] ?? 0;
      return { label: meta.label, actual, meta: meta.meta, unidad: meta.unidad, pct: pct(actual, meta.meta) };
    });

    // 4) Veredas del municipio con propuestas
    const veredasRows = await sql<{ id_vereda: number; nombre: string; num_propuestas: number }[]>`
      WITH prop_muni AS (
        SELECT id_propuesta FROM unnest(${sql.array(propIds, 23)}) AS id_propuesta
      )
      SELECT v.id_vereda, v.nombre_vereda AS nombre, count(DISTINCT pp.id_propuesta)::int AS num_propuestas
      FROM prop_muni pm
      JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pm.id_propuesta
      JOIN sgs_pre_predio p ON p.id_predio = pp.id_predio
      JOIN bcs_lpa_vereda v ON v.id_vereda = p.id_vereda
      WHERE v.id_municipio = ${idMunicipio}
      GROUP BY v.id_vereda, v.nombre_vereda
      ORDER BY num_propuestas DESC, v.nombre_vereda
    `;

    // 5) Distribución por componente/acción
    const distRows = await sql<{ componente: string; accion: string; n: number }[]>`
      WITH prop_muni AS (
        SELECT id_propuesta FROM unnest(${sql.array(propIds, 23)}) AS id_propuesta
      )
      SELECT c.nombre AS componente, a.nombre AS accion, count(DISTINCT pp.id_propuesta)::int AS n
      FROM prop_muni pm
      JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pm.id_propuesta
      JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      GROUP BY c.nombre, a.nombre
      ORDER BY c.nombre, a.nombre
    `;

    return {
      municipio,
      indicadores,
      veredas: veredasRows.map((row) => ({
        id_vereda: pgInt(row.id_vereda),
        nombre: pgText(row.nombre),
        num_propuestas: pgInt(row.num_propuestas),
      })),
      propuestas_por_componente: distRows.map((row) => ({
        componente: pgText(row.componente),
        accion: pgText(row.accion),
        n: pgInt(row.n),
      })),
    };
  },
  {
    tags: ["metas", "convenio", "municipio"],
    ttl: 60,
  },
);
