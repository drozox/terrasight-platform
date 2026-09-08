// =============================================================================
// metas-convenio.ts — Indicadores del convenio CAR-WWF-Fundación Natura
//
// 5 metas operativas con sus targets y consultas SQL optimizadas.
// Usa unaccent() para tolerar tildes en nombres de actividad
// (ej. "Obras de captación" → "captacion").
//
// Targets (definidos en el spec de Nikoll):
//   C1A1: 12 km cercos vivos + 12 km aislamientos (cerco de alambre)
//   C1A2: 15 ha conectividad + 15 ha silvopastoriles + 15 ha agroforestales
//   C2A1: 79 cosecha de agua + 79 compostaje
//   C2A2: 7 estaciones limnimétricas + 48 obras de captación
//   C3:   35 predios en áreas protegidas
// =============================================================================

import { sql, pgInt, pgNum, pgText } from "../db";
import { cached } from "./_cache";

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
// C1A1: Conservación del Recurso Hídrico (líneas)
// =============================================================================
async function getC1A1(): Promise<MetaComponente> {
  const rows = await sql<{
    km_cercos_vivos: number | string;
    km_alambre: number | string;
    km_multiestrat: number | string;
  }[]>`
    SELECT
      round(SUM(CASE WHEN unaccent(pl.actividad) ILIKE unaccent('%cerco vivo%')
                       OR unaccent(pl.actividad) ILIKE unaccent('%cerca viva%')
                      THEN pl.longitud_km ELSE 0 END)::numeric, 3) AS km_cercos_vivos,
      round(SUM(CASE WHEN unaccent(pl.actividad) ILIKE unaccent('%alambre%')
                      THEN pl.longitud_km ELSE 0 END)::numeric, 3) AS km_alambre,
      round(SUM(CASE WHEN unaccent(pl.actividad) ILIKE unaccent('%multiestrat%')
                      THEN pl.longitud_km ELSE 0 END)::numeric, 3) AS km_multiestrat
    FROM sgs_pro_propuesta_linea pl
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C1' AND a.nombre = 'A1'
  `;
  const r = rows[0];
  const cerVivos = pgNum(r.km_cercos_vivos);
  const alambre = pgNum(r.km_alambre);
  const multiestrat = pgNum(r.km_multiestrat);
  return {
    componente: "C1",
    accion: "A1",
    descripcion: "Conservación del Recurso Hídrico a través de Medidas de Adaptación al Cambio Climático",
    indicadores: [
      { label: "Cercos vivos", actual: cerVivos, meta: 12, unidad: "km", pct: pct(cerVivos, 12) },
      { label: "Aislamientos (cerco de alambre)", actual: alambre, meta: 12, unidad: "km", pct: pct(alambre, 12) },
      { label: "Cercas multiestratificadas (extra)", actual: multiestrat, meta: 0, unidad: "km", pct: 0 },
    ],
  };
}

// =============================================================================
// C1A2: 15 km conectividad + 15 ha silvopastoril + 15 ha agroforestal
//
// Conectividad operativa = Franjas de Conectividad (líneas) → km lineales.
// Silvopastoril/Agroforestal = polígonos con actividades relacionadas → ha.
// =============================================================================
async function getC1A2(): Promise<MetaComponente> {
  const rows = await sql<{
    km_conectividad: number | string;
    ha_silvopastoril: number | string;
    ha_agroforestal: number | string;
  }[]>`
    SELECT
      -- Conectividad: suma km de líneas con "Franja de Conectividad"
      round((
        SELECT COALESCE(SUM(pl.longitud_km), 0)
        FROM sgs_pro_propuesta_linea pl
        JOIN sgs_pro_propuesta pp2 ON pp2.id_propuesta = pl.id_propuesta
        JOIN sgs_com_accion a2 ON a2.id_accion = pp2.id_accion
        JOIN sgs_com_componente c2 ON c2.id_componente = a2.id_componente
        WHERE c2.nombre = 'C1' AND a2.nombre = 'A2'
          AND (unaccent(pl.actividad) ILIKE unaccent('%franja%conectividad%')
               OR unaccent(pl.actividad) ILIKE unaccent('%conectividad%'))
      )::numeric, 3) AS km_conectividad,
      -- Silvopastoril: polígonos con actividades silvopastoriles
      round(SUM(CASE WHEN unaccent(pq.actividad) ILIKE unaccent('%silvopastoril%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%silvopast%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%pastos arbolados%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%pastos%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%arbol%dispers%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%arboles dispersos%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%rastrojo%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%pradera%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%potrero%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%ssp%')
                      THEN pq.area_ha ELSE 0 END)::numeric, 2) AS ha_silvopastoril,
      -- Agroforestal: polígonos con actividades agroforestales
      round(SUM(CASE WHEN unaccent(pq.actividad) ILIKE unaccent('%agroforestal%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%bosque%comestible%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%modulo%alta densidad%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%modulo%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%banco%proteina%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%banco%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%huerta%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%callejon%')
                      THEN pq.area_ha ELSE 0 END)::numeric, 2) AS ha_agroforestal
    FROM sgs_pro_propuesta_poligono pq
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  `;
  const r = rows[0];
  const conectividad = pgNum(r.km_conectividad);
  const silvopastoril = pgNum(r.ha_silvopastoril);
  const agroforestal = pgNum(r.ha_agroforestal);
  return {
    componente: "C1",
    accion: "A2",
    descripcion: "Conectividad y reconversión agroforestal",
    indicadores: [
      // Conectividad se mide en km (franjas lineales), no en ha.
      { label: "Franjas de conectividad", actual: conectividad, meta: 15, unidad: "km", pct: pct(conectividad, 15) },
      { label: "Sistemas silvopastoriles", actual: silvopastoril, meta: 15, unidad: "ha", pct: pct(silvopastoril, 15) },
      { label: "Sistemas agroforestales", actual: agroforestal, meta: 15, unidad: "ha", pct: pct(agroforestal, 15) },
    ],
  };
}

// =============================================================================
// C2A1: 79 cosecha de agua + 79 compostaje (puntos)
// =============================================================================
async function getC2A1(): Promise<MetaComponente> {
  const rows = await sql<{ n_cosecha: number; n_compostaje: number }[]>`
    SELECT
      SUM(CASE WHEN unaccent(pt.actividad) ILIKE unaccent('%cosecha%') THEN 1 ELSE 0 END)::int AS n_cosecha,
      SUM(CASE WHEN unaccent(pt.actividad) ILIKE unaccent('%compostaje%')
                  OR unaccent(pt.actividad) ILIKE unaccent('%compost%')
                THEN 1 ELSE 0 END)::int AS n_compostaje
    FROM sgs_pro_propuesta_punto pt
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C2' AND a.nombre = 'A1'
  `;
  const r = rows[0];
  return {
    componente: "C2",
    accion: "A1",
    descripcion: "Manejo del Ciclo del Agua y Restauración de Suelos",
    indicadores: [
      { label: "Cosecha de agua", actual: r.n_cosecha, meta: 79, unidad: "obras", pct: pct(r.n_cosecha, 79) },
      { label: "Kit de compostaje", actual: r.n_compostaje, meta: 79, unidad: "kits", pct: pct(r.n_compostaje, 79) },
    ],
  };
}

// =============================================================================
// C2A2: 7 estaciones + 48 obras de captación (puntos)
//
// La meta operativa se mide sobre el TOTAL de obras y estaciones
// (independiente del C-A donde estén). El spec dice "sumar todas las similares":
//   - Estaciones: 6 en C2A2 + 1 en C3A1 = 7 (meta 7) ✅
//   - Obras:      95 en C2A2 + 1 en C3A1 = 96 (meta 48) ✅ 200% superada
// =============================================================================
async function getC2A2(): Promise<MetaComponente> {
  const rows = await sql<{ n_estaciones: number; n_obras: number }[]>`
    SELECT
      SUM(CASE WHEN unaccent(pt.actividad) ILIKE unaccent('%estacion%limnimet%')
                  OR unaccent(pt.actividad) ILIKE unaccent('%limnimet%')
                THEN 1 ELSE 0 END)::int AS n_estaciones,
      SUM(CASE WHEN unaccent(pt.actividad) ILIKE unaccent('%captacion%')
                  OR unaccent(pt.actividad) ILIKE unaccent('%captaci%')
                THEN 1 ELSE 0 END)::int AS n_obras
    FROM sgs_pro_propuesta_punto pt
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
  `;
  const r = rows[0];
  return {
    componente: "C2",
    accion: "A2",
    descripcion: "Estaciones limnimétricas y obras de captación",
    indicadores: [
      { label: "Estaciones limnimétricas", actual: r.n_estaciones, meta: 7, unidad: "estaciones", pct: pct(r.n_estaciones, 7) },
      { label: "Obras de captación", actual: r.n_obras, meta: 48, unidad: "obras", pct: pct(r.n_obras, 48) },
    ],
  };
}

// =============================================================================
// C3: 35 predios en áreas protegidas
// =============================================================================
async function getC3(): Promise<MetaComponente> {
  const rows = await sql<{
    n_predios: number;
    n_predios_con_geom: number;
  }[]>`
    SELECT
      count(DISTINCT pp.id_predio)::int AS n_predios,
      count(DISTINCT CASE WHEN p.geom IS NOT NULL THEN pp.id_predio END)::int AS n_predios_con_geom
    FROM sgs_pro_propuesta pp
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    JOIN sgs_pre_predio p ON p.id_predio = pp.id_predio
    WHERE c.nombre = 'C3' AND pp.id_predio IS NOT NULL
  `;
  const r = rows[0];
  return {
    componente: "C3",
    accion: "*",
    descripcion: "Reconversión Productiva en Áreas Protegidas y Páramos",
    indicadores: [
      { label: "Predios intervenidos en áreas protegidas", actual: r.n_predios, meta: 35, unidad: "predios", pct: pct(r.n_predios, 35) },
    ],
  };
}

// =============================================================================
// Adicional: Municipios y veredas intervenidos
//
// Cubre los dos casos del spec:
//   1) Propuestas con id_predio → municipio/vereda del predio (lookup)
//   2) Propuestas con geom (líneas/polígonos) → intersección espacial con municipio/vereda
//   3) Propuestas_punto sin geom ni id_predio (C2 obras) → se excluyen del detalle geográfico
// =============================================================================
async function getMunicipiosIntervenidos() {
  return sql<{ id_municipio: number; nombre: string; num_propuestas: number }[]>`
    WITH propuestas_geo AS (
      -- (1) Propuestas con id_predio: municipio via vereda
      SELECT DISTINCT pp.id_propuesta, m.id_municipio, m.nombre_municipio
      FROM sgs_pro_propuesta pp
      JOIN sgs_pre_predio p ON p.id_predio = pp.id_predio
      JOIN bcs_lpa_vereda v ON v.id_vereda = p.id_vereda
      JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
      WHERE pp.id_predio IS NOT NULL
      UNION
      -- (2) Líneas: intersección espacial
      SELECT DISTINCT pp.id_propuesta, m.id_municipio, m.nombre_municipio
      FROM sgs_pro_propuesta_linea pl
      JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
      JOIN bcs_lpa_municipio m ON ST_Intersects(m.geom, pl.geom)
      UNION
      -- (2) Polígonos: intersección espacial
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
      -- (1) Propuestas con id_predio: vereda directa
      SELECT DISTINCT pp.id_propuesta, v.id_vereda, v.nombre_vereda, m.id_municipio, m.nombre_municipio
      FROM sgs_pro_propuesta pp
      JOIN sgs_pre_predio p ON p.id_predio = pp.id_predio
      JOIN bcs_lpa_vereda v ON v.id_vereda = p.id_vereda
      JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
      WHERE pp.id_predio IS NOT NULL
      UNION
      -- (2) Líneas: intersección espacial con vereda
      SELECT DISTINCT pp.id_propuesta, v.id_vereda, v.nombre_vereda, m.id_municipio, m.nombre_municipio
      FROM sgs_pro_propuesta_linea pl
      JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
      JOIN bcs_lpa_vereda v ON ST_Intersects(v.geom, pl.geom)
      JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
      UNION
      -- (2) Polígonos: intersección espacial con vereda
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
  const [c1a1, c1a2, c2a1, c2a2, c3, municipios, veredas] = await Promise.all([
    getC1A1(),
    getC1A2(),
    getC2A1(),
    getC2A2(),
    getC3(),
    getMunicipiosIntervenidos(),
    getVeredasIntervenidas(),
  ]);
  return {
    c1a1,
    c1a2,
    c2a1,
    c2a2,
    c3,
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
// Devuelve:
//   - metadatos del municipio
//   - 5 indicadores de meta (mismos nombres que la página principal) pero
//     filtrados a las propuestas que intersectan el municipio
//   - lista de veredas con conteo
//   - distribución por componente/acción
//
// Cuando una propuesta_linea o poligono cruza múltiples municipios, se cuenta
// para todos los que toca (vía ST_Intersects). Para prop_super con id_predio,
// se asigna al municipio del predio.
// =============================================================================
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

    // CTE con todas las propuestas que tocan este municipio
    // (id_predio → vereda → municipio, o intersección espacial con líneas/polígonos)
    const idsResult = await sql<{ id_propuesta: number; fuente: string }[]>`
      WITH propuestas_municipio AS (
        SELECT DISTINCT pp.id_propuesta, 'predio'::text AS fuente
        FROM sgs_pro_propuesta pp
        JOIN sgs_pre_predio p ON p.id_predio = pp.id_predio
        JOIN bcs_lpa_vereda v ON v.id_vereda = p.id_vereda
        WHERE v.id_municipio = ${idMunicipio}
        UNION
        SELECT DISTINCT pp.id_propuesta, 'linea'::text
        FROM sgs_pro_propuesta_linea pl
        JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
        JOIN bcs_lpa_municipio m ON m.id_municipio = ${idMunicipio} AND ST_Intersects(m.geom, pl.geom)
        UNION
        SELECT DISTINCT pp.id_propuesta, 'poligono'::text
        FROM sgs_pro_propuesta_poligono pq
        JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
        JOIN bcs_lpa_municipio m ON m.id_municipio = ${idMunicipio} AND ST_Intersects(m.geom, pq.geom)
      )
      SELECT id_propuesta, fuente FROM propuestas_municipio
    `;
    const propIds: number[] = idsResult.map((r) => Number(r.id_propuesta)).filter((n) => Number.isFinite(n));
    if (propIds.length === 0) {
      return {
        municipio,
        indicadores: [],
        veredas: [],
        propuestas_por_componente: [],
      };
    }

    // 2) Indicadores de las 5 metas operativas (filtrados al municipio)
    //    Reutilizamos la misma lógica de fuzzy match que getC1A1, etc.
    const indRows = await sql<{
      km_cercos_vivos: number | string;
      km_alambre: number | string;
      km_conectividad: number | string;
      ha_silvopastoril: number | string;
      ha_agroforestal: number | string;
      n_cosecha: number;
      n_compostaje: number;
      n_estaciones: number;
      n_obras: number;
      n_predios_c3: number;
    }[]>`
      WITH prop_muni AS (
        SELECT id_propuesta FROM unnest(${sql.array(propIds, 23)}) AS id_propuesta
      )
      SELECT
        -- C1A1 (líneas)
        (SELECT round(COALESCE(SUM(pl.longitud_km), 0)::numeric, 3)
         FROM sgs_pro_propuesta_linea pl
         JOIN prop_muni ON prop_muni.id_propuesta = pl.id_propuesta
         WHERE unaccent(pl.actividad) ILIKE unaccent('%cerco vivo%')
            OR unaccent(pl.actividad) ILIKE unaccent('%cerca viva%')
        ) AS km_cercos_vivos,
        (SELECT round(COALESCE(SUM(pl.longitud_km), 0)::numeric, 3)
         FROM sgs_pro_propuesta_linea pl
         JOIN prop_muni ON prop_muni.id_propuesta = pl.id_propuesta
         WHERE unaccent(pl.actividad) ILIKE unaccent('%alambre%')
        ) AS km_alambre,
        -- C1A2 conectividad (líneas)
        (SELECT round(COALESCE(SUM(pl.longitud_km), 0)::numeric, 3)
         FROM sgs_pro_propuesta_linea pl
         JOIN prop_muni ON prop_muni.id_propuesta = pl.id_propuesta
         WHERE unaccent(pl.actividad) ILIKE unaccent('%franja%conectividad%')
            OR unaccent(pl.actividad) ILIKE unaccent('%conectividad%')
        ) AS km_conectividad,
        -- C1A2 silvopastoril (polígonos)
        (SELECT round(COALESCE(SUM(pq.area_ha), 0)::numeric, 2)
         FROM sgs_pro_propuesta_poligono pq
         JOIN prop_muni ON prop_muni.id_propuesta = pq.id_propuesta
         WHERE unaccent(pq.actividad) ILIKE unaccent('%silvopastoril%')
            OR unaccent(pq.actividad) ILIKE unaccent('%silvopast%')
            OR unaccent(pq.actividad) ILIKE unaccent('%pastos arbolados%')
            OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%pastos%')
            OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%arbol%dispers%')
            OR unaccent(pq.actividad) ILIKE unaccent('%arboles dispersos%')
            OR unaccent(pq.actividad) ILIKE unaccent('%rastrojo%')
            OR unaccent(pq.actividad) ILIKE unaccent('%pradera%')
            OR unaccent(pq.actividad) ILIKE unaccent('%potrero%')
            OR unaccent(pq.actividad) ILIKE unaccent('%ssp%')
        ) AS ha_silvopastoril,
        -- C1A2 agroforestal (polígonos)
        (SELECT round(COALESCE(SUM(pq.area_ha), 0)::numeric, 2)
         FROM sgs_pro_propuesta_poligono pq
         JOIN prop_muni ON prop_muni.id_propuesta = pq.id_propuesta
         WHERE unaccent(pq.actividad) ILIKE unaccent('%agroforestal%')
            OR unaccent(pq.actividad) ILIKE unaccent('%bosque%comestible%')
            OR unaccent(pq.actividad) ILIKE unaccent('%modulo%alta densidad%')
            OR unaccent(pq.actividad) ILIKE unaccent('%modulo%')
            OR unaccent(pq.actividad) ILIKE unaccent('%banco%proteina%')
            OR unaccent(pq.actividad) ILIKE unaccent('%banco%')
            OR unaccent(pq.actividad) ILIKE unaccent('%huerta%')
            OR unaccent(pq.actividad) ILIKE unaccent('%callejon%')
        ) AS ha_agroforestal,
        -- C2A1 cosecha + compostaje (puntos)
        (SELECT COUNT(*)::int FROM sgs_pro_propuesta_punto pt
         JOIN prop_muni ON prop_muni.id_propuesta = pt.id_propuesta
         WHERE unaccent(pt.actividad) ILIKE unaccent('%cosecha%')
        ) AS n_cosecha,
        (SELECT COUNT(*)::int FROM sgs_pro_propuesta_punto pt
         JOIN prop_muni ON prop_muni.id_propuesta = pt.id_propuesta
         WHERE unaccent(pt.actividad) ILIKE unaccent('%compostaje%')
            OR unaccent(pt.actividad) ILIKE unaccent('%compost%')
        ) AS n_compostaje,
        -- C2A2 estaciones + obras (puntos, total)
        (SELECT COUNT(*)::int FROM sgs_pro_propuesta_punto pt
         JOIN prop_muni ON prop_muni.id_propuesta = pt.id_propuesta
         WHERE unaccent(pt.actividad) ILIKE unaccent('%estacion%limnimet%')
            OR unaccent(pt.actividad) ILIKE unaccent('%limnimet%')
        ) AS n_estaciones,
        (SELECT COUNT(*)::int FROM sgs_pro_propuesta_punto pt
         JOIN prop_muni ON prop_muni.id_propuesta = pt.id_propuesta
         WHERE unaccent(pt.actividad) ILIKE unaccent('%captacion%')
            OR unaccent(pt.actividad) ILIKE unaccent('%captaci%')
        ) AS n_obras,
        -- C3 predios
        (SELECT COUNT(DISTINCT pp.id_predio)::int
         FROM sgs_pro_propuesta pp
         JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
         JOIN sgs_com_componente c ON c.id_componente = a.id_componente
         JOIN prop_muni ON prop_muni.id_propuesta = pp.id_propuesta
         WHERE c.nombre = 'C3' AND pp.id_predio IS NOT NULL
        ) AS n_predios_c3
    `;
    const r = indRows[0];
    const indicadores: DetalleMunicipio["indicadores"] = [
      { label: "Cercos vivos", actual: pgNum(r.km_cercos_vivos), meta: 12, unidad: "km", pct: pct(pgNum(r.km_cercos_vivos), 12) },
      { label: "Aislamientos (alambre)", actual: pgNum(r.km_alambre), meta: 12, unidad: "km", pct: pct(pgNum(r.km_alambre), 12) },
      { label: "Franjas de conectividad", actual: pgNum(r.km_conectividad), meta: 15, unidad: "km", pct: pct(pgNum(r.km_conectividad), 15) },
      { label: "Sistemas silvopastoriles", actual: pgNum(r.ha_silvopastoril), meta: 15, unidad: "ha", pct: pct(pgNum(r.ha_silvopastoril), 15) },
      { label: "Sistemas agroforestales", actual: pgNum(r.ha_agroforestal), meta: 15, unidad: "ha", pct: pct(pgNum(r.ha_agroforestal), 15) },
      { label: "Cosecha de agua", actual: pgInt(r.n_cosecha), meta: 79, unidad: "obras", pct: pct(pgInt(r.n_cosecha), 79) },
      { label: "Kit de compostaje", actual: pgInt(r.n_compostaje), meta: 79, unidad: "kits", pct: pct(pgInt(r.n_compostaje), 79) },
      { label: "Estaciones limnimétricas", actual: pgInt(r.n_estaciones), meta: 7, unidad: "estaciones", pct: pct(pgInt(r.n_estaciones), 7) },
      { label: "Obras de captación", actual: pgInt(r.n_obras), meta: 48, unidad: "obras", pct: pct(pgInt(r.n_obras), 48) },
      { label: "Predios C3 (áreas protegidas)", actual: pgInt(r.n_predios_c3), meta: 35, unidad: "predios", pct: pct(pgInt(r.n_predios_c3), 35) },
    ];

    // 3) Veredas del municipio con propuestas
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

    // 4) Distribución por componente/acción
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
