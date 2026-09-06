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
// C1A2: 15 ha conectividad + 15 ha silvopastoril + 15 ha agroforestal (polígonos)
// =============================================================================
async function getC1A2(): Promise<MetaComponente> {
  const rows = await sql<{
    ha_conectividad: number | string;
    ha_silvopastoril: number | string;
    ha_agroforestal: number | string;
  }[]>`
    SELECT
      round(SUM(CASE WHEN unaccent(pq.actividad) ILIKE unaccent('%conectividad%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%franja%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%arreglo perimetral%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%perimetral%')
                      THEN pq.area_ha ELSE 0 END)::numeric, 2) AS ha_conectividad,
      round(SUM(CASE WHEN unaccent(pq.actividad) ILIKE unaccent('%silvopastoril%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%silvopast%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%pastos arbolados%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%pradera%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%potrero%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%ssp%')
                      THEN pq.area_ha ELSE 0 END)::numeric, 2) AS ha_silvopastoril,
      round(SUM(CASE WHEN unaccent(pq.actividad) ILIKE unaccent('%agroforestal%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%huerta%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%callejon%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%modulo%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%banco%')
                       OR unaccent(pq.actividad) ILIKE unaccent('%bosque comestible%')
                      THEN pq.area_ha ELSE 0 END)::numeric, 2) AS ha_agroforestal
    FROM sgs_pro_propuesta_poligono pq
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  `;
  const r = rows[0];
  const conectividad = pgNum(r.ha_conectividad);
  const silvopastoril = pgNum(r.ha_silvopastoril);
  const agroforestal = pgNum(r.ha_agroforestal);
  return {
    componente: "C1",
    accion: "A2",
    descripcion: "Conectividad y reconversión agroforestal",
    indicadores: [
      { label: "Franjas de conectividad", actual: conectividad, meta: 15, unidad: "ha", pct: pct(conectividad, 15) },
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
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C2' AND a.nombre = 'A2'
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
// =============================================================================
async function getMunicipiosIntervenidos() {
  return sql<{ id_municipio: number; nombre: string; num_propuestas: number }[]>`
    SELECT m.id_municipio, m.nombre_municipio AS nombre, count(DISTINCT pp.id_propuesta)::int AS num_propuestas
    FROM sgs_pro_propuesta pp
    JOIN sgs_pre_predio p ON p.id_predio = pp.id_predio
    JOIN bcs_lpa_vereda v ON v.id_vereda = p.id_vereda
    JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
    WHERE pp.id_predio IS NOT NULL
    GROUP BY m.id_municipio, m.nombre_municipio
    ORDER BY num_propuestas DESC, m.nombre_municipio
  `;
}

async function getVeredasIntervenidas() {
  return sql<{ id_vereda: number; nombre: string; id_municipio: number; nombre_municipio: string; num_propuestas: number }[]>`
    SELECT v.id_vereda, v.nombre_vereda AS nombre, m.id_municipio, m.nombre_municipio, count(DISTINCT pp.id_propuesta)::int AS num_propuestas
    FROM sgs_pro_propuesta pp
    JOIN sgs_pre_predio p ON p.id_predio = pp.id_predio
    JOIN bcs_lpa_vereda v ON v.id_vereda = p.id_vereda
    JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
    WHERE pp.id_predio IS NOT NULL
    GROUP BY v.id_vereda, v.nombre_vereda, m.id_municipio, m.nombre_municipio
    ORDER BY num_propuestas DESC, m.nombre_municipio, v.nombre_vereda
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
