// =============================================================================
// resumen-componente.ts — Motor único del dashboard "componente-céntrico"
//
// Un solo punto de verdad para TODAS las secciones del dashboard. Devuelve,
// para un componente (C1/C2/C3) o para "Todos" (null):
//   - los indicadores del convenio que le pertenecen (actual/meta/pct/estado)
//   - conteos (propuestas, predios, puntos, líneas, polígonos, ha, km, muni, veredas)
//   - distribución por acción (A1/A2/U) y top municipios/veredas
//
// Los indicadores se toman de `sgs_v_indicador_*` (fuente única, migración 36),
// filtrando por el componente dueño definido en INDICADORES_META (`ca`). Así el
// global y el componente nunca divergen.
// =============================================================================

import { sql, pgInt, pgNum, pgText } from "../db";
import { withFallback } from "./_helpers";
import { cached } from "./_cache";
import {
  getIndicadoresFlat,
  INDICADORES_META,
  type IndicadorKey,
  type IndicadorMeta,
} from "./metas-convenio";
import { estadoDePct, type EstadoIndicador } from "../estado-indicador";

export type { EstadoIndicador };

export type ComponenteKey = "C1" | "C2" | "C3";

export interface IndicadorResumen {
  key: IndicadorKey;
  label: string;
  actual: number;
  meta: number;
  unidad: string;
  pct: number;
  cumplida: boolean;
  estado: EstadoIndicador;
  /** Acción dentro del componente: "A1" | "A2" | "*" (todas). */
  accion: string;
}

export interface ResumenComponente {
  /** null = "Todos los componentes". */
  componente: ComponenteKey | null;
  etiqueta: string;
  indicadores: IndicadorResumen[];
  cumplidas: number;
  totalIndicadores: number;
  /** Promedio de cumplimiento (cap 100) de los indicadores del componente. */
  pctGlobal: number;
  conteos: {
    propuestas: number;
    predios: number;
    puntos: number;
    lineas: number;
    poligonos: number;
    hectareas: number;
    kilometros: number;
    municipios: number;
    veredas: number;
  };
  porAccion: { accion: string; n: number }[];
  topMunicipios: { id: number; nombre: string; propuestas: number }[];
  topVeredas: { id: number; nombre: string; municipio: string; propuestas: number }[];
}

const ETIQUETA: Record<ComponenteKey, string> = {
  C1: "Componente 1",
  C2: "Componente 2",
  C3: "Componente 3",
};

const CA_COMPONENTE: Record<IndicadorMeta["ca"], ComponenteKey> = {
  C1A1: "C1",
  C1A2: "C1",
  C2A1: "C2",
  C2A2: "C2",
  C3: "C3",
};

export function normalizarComponente(v?: string | null): ComponenteKey | null {
  return v === "C1" || v === "C2" || v === "C3" ? v : null;
}

export function etiquetaComponente(comp: ComponenteKey | null): string {
  return comp ? ETIQUETA[comp] : "Todos los componentes";
}

function keysDeComponente(comp: ComponenteKey | null): IndicadorKey[] {
  const keys = Object.keys(INDICADORES_META) as IndicadorKey[];
  if (!comp) return keys;
  return keys.filter((k) => CA_COMPONENTE[INDICADORES_META[k].ca] === comp);
}

// -----------------------------------------------------------------------------
// Conteos base
// -----------------------------------------------------------------------------
interface ConteosRow {
  propuestas: number | string;
  predios: number | string;
  puntos: number | string;
  lineas: number | string;
  kilometros: number | string;
  poligonos: number | string;
  hectareas: number | string;
}

async function getConteos(comp: ComponenteKey | null): Promise<ResumenComponente["conteos"]> {
  const [row] = await sql<ConteosRow[]>`
    WITH p AS (
      SELECT pp.id_propuesta, pp.id_predio
      FROM sgs_pro_propuesta pp
      JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE (${comp}::text IS NULL OR c.nombre = ${comp})
    )
    SELECT
      (SELECT count(*) FROM p)::int                                                        AS propuestas,
      (SELECT count(DISTINCT id_predio) FROM p)::int                                       AS predios,
      (SELECT count(*) FROM sgs_pro_propuesta_punto    pt JOIN p ON p.id_propuesta = pt.id_propuesta)::int AS puntos,
      (SELECT count(*) FROM sgs_pro_propuesta_linea    pl JOIN p ON p.id_propuesta = pl.id_propuesta)::int AS lineas,
      (SELECT COALESCE(SUM(pl.longitud_km), 0) FROM sgs_pro_propuesta_linea pl JOIN p ON p.id_propuesta = pl.id_propuesta)::numeric AS kilometros,
      (SELECT count(*) FROM sgs_pro_propuesta_poligono pq JOIN p ON p.id_propuesta = pq.id_propuesta)::int AS poligonos,
      (SELECT COALESCE(SUM(pq.area_ha), 0) FROM sgs_pro_propuesta_poligono pq JOIN p ON p.id_propuesta = pq.id_propuesta)::numeric AS hectareas
  `;

  const [mv] = await sql<{ municipios: number | string; veredas: number | string }[]>`
    WITH p AS (
      SELECT pp.id_propuesta, pp.id_predio
      FROM sgs_pro_propuesta pp
      JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE (${comp}::text IS NULL OR c.nombre = ${comp})
    ),
    muni AS (
      SELECT v.id_municipio
      FROM p
      JOIN sgs_pre_predio    pr ON pr.id_predio = p.id_predio
      JOIN bcs_lpa_vereda    v  ON v.id_vereda   = pr.id_vereda
      WHERE p.id_predio IS NOT NULL
      UNION
      SELECT m.id_municipio FROM p JOIN sgs_pro_propuesta_punto    pt ON pt.id_propuesta = p.id_propuesta JOIN bcs_lpa_municipio m ON ST_Intersects(m.geom, pt.geom)
      UNION
      SELECT m.id_municipio FROM p JOIN sgs_pro_propuesta_linea    pl ON pl.id_propuesta = p.id_propuesta JOIN bcs_lpa_municipio m ON ST_Intersects(m.geom, pl.geom)
      UNION
      SELECT m.id_municipio FROM p JOIN sgs_pro_propuesta_poligono pq ON pq.id_propuesta = p.id_propuesta JOIN bcs_lpa_municipio m ON ST_Intersects(m.geom, pq.geom)
    ),
    vereda AS (
      SELECT v.id_vereda
      FROM p
      JOIN sgs_pre_predio  pr ON pr.id_predio = p.id_predio
      JOIN bcs_lpa_vereda  v  ON v.id_vereda  = pr.id_vereda
      WHERE p.id_predio IS NOT NULL
      UNION
      SELECT v.id_vereda FROM p JOIN sgs_pro_propuesta_punto    pt ON pt.id_propuesta = p.id_propuesta JOIN bcs_lpa_vereda v ON ST_Intersects(v.geom, pt.geom)
      UNION
      SELECT v.id_vereda FROM p JOIN sgs_pro_propuesta_linea    pl ON pl.id_propuesta = p.id_propuesta JOIN bcs_lpa_vereda v ON ST_Intersects(v.geom, pl.geom)
      UNION
      SELECT v.id_vereda FROM p JOIN sgs_pro_propuesta_poligono pq ON pq.id_propuesta = p.id_propuesta JOIN bcs_lpa_vereda v ON ST_Intersects(v.geom, pq.geom)
    )
    SELECT (SELECT count(*) FROM muni)::int AS municipios, (SELECT count(*) FROM vereda)::int AS veredas
  `;

  return {
    propuestas: pgInt(row?.propuestas),
    predios: pgInt(row?.predios),
    puntos: pgInt(row?.puntos),
    lineas: pgInt(row?.lineas),
    poligonos: pgInt(row?.poligonos),
    hectareas: pgNum(row?.hectareas),
    kilometros: pgNum(row?.kilometros),
    municipios: pgInt(mv?.municipios),
    veredas: pgInt(mv?.veredas),
  };
}

async function getPorAccion(comp: ComponenteKey | null): Promise<ResumenComponente["porAccion"]> {
  const rows = await sql<{ accion: string; n: number | string }[]>`
    SELECT a.nombre AS accion, count(DISTINCT pp.id_propuesta)::int AS n
    FROM sgs_pro_propuesta pp
    JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE (${comp}::text IS NULL OR c.nombre = ${comp})
    GROUP BY a.nombre
    ORDER BY a.nombre
  `;
  return rows.map((r) => ({ accion: pgText(r.accion), n: pgInt(r.n) }));
}

async function getTopMunicipios(comp: ComponenteKey | null): Promise<ResumenComponente["topMunicipios"]> {
  const rows = await sql<{ id: number | string; nombre: string; propuestas: number | string }[]>`
    WITH p AS (
      SELECT pp.id_propuesta, pp.id_predio
      FROM sgs_pro_propuesta pp
      JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE (${comp}::text IS NULL OR c.nombre = ${comp})
    ),
    muni AS (
      SELECT p.id_propuesta, m.id_municipio, m.nombre_municipio
      FROM p
      JOIN sgs_pre_predio   pr ON pr.id_predio = p.id_predio
      JOIN bcs_lpa_vereda   v  ON v.id_vereda  = pr.id_vereda
      JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
      WHERE p.id_predio IS NOT NULL
      UNION
      SELECT p.id_propuesta, m.id_municipio, m.nombre_municipio FROM p JOIN sgs_pro_propuesta_punto    pt ON pt.id_propuesta = p.id_propuesta JOIN bcs_lpa_municipio m ON ST_Intersects(m.geom, pt.geom)
      UNION
      SELECT p.id_propuesta, m.id_municipio, m.nombre_municipio FROM p JOIN sgs_pro_propuesta_linea    pl ON pl.id_propuesta = p.id_propuesta JOIN bcs_lpa_municipio m ON ST_Intersects(m.geom, pl.geom)
      UNION
      SELECT p.id_propuesta, m.id_municipio, m.nombre_municipio FROM p JOIN sgs_pro_propuesta_poligono pq ON pq.id_propuesta = p.id_propuesta JOIN bcs_lpa_municipio m ON ST_Intersects(m.geom, pq.geom)
    )
    SELECT id_municipio AS id, nombre_municipio AS nombre, count(DISTINCT id_propuesta)::int AS propuestas
    FROM muni
    GROUP BY id_municipio, nombre_municipio
    ORDER BY propuestas DESC, nombre_municipio
    LIMIT 6
  `;
  return rows.map((r) => ({ id: pgInt(r.id), nombre: pgText(r.nombre), propuestas: pgInt(r.propuestas) }));
}

async function getTopVeredas(comp: ComponenteKey | null): Promise<ResumenComponente["topVeredas"]> {
  const rows = await sql<{ id: number | string; nombre: string; municipio: string; propuestas: number | string }[]>`
    WITH p AS (
      SELECT pp.id_propuesta, pp.id_predio
      FROM sgs_pro_propuesta pp
      JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE (${comp}::text IS NULL OR c.nombre = ${comp})
    ),
    ver AS (
      SELECT p.id_propuesta, v.id_vereda, v.nombre_vereda, m.nombre_municipio
      FROM p
      JOIN sgs_pre_predio   pr ON pr.id_predio = p.id_predio
      JOIN bcs_lpa_vereda   v  ON v.id_vereda  = pr.id_vereda
      JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
      WHERE p.id_predio IS NOT NULL
      UNION
      SELECT p.id_propuesta, v.id_vereda, v.nombre_vereda, m.nombre_municipio FROM p JOIN sgs_pro_propuesta_punto    pt ON pt.id_propuesta = p.id_propuesta JOIN bcs_lpa_vereda v ON ST_Intersects(v.geom, pt.geom) JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
      UNION
      SELECT p.id_propuesta, v.id_vereda, v.nombre_vereda, m.nombre_municipio FROM p JOIN sgs_pro_propuesta_linea    pl ON pl.id_propuesta = p.id_propuesta JOIN bcs_lpa_vereda v ON ST_Intersects(v.geom, pl.geom) JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
      UNION
      SELECT p.id_propuesta, v.id_vereda, v.nombre_vereda, m.nombre_municipio FROM p JOIN sgs_pro_propuesta_poligono pq ON pq.id_propuesta = p.id_propuesta JOIN bcs_lpa_vereda v ON ST_Intersects(v.geom, pq.geom) JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
    )
    SELECT id_vereda AS id, nombre_vereda AS nombre, nombre_municipio AS municipio, count(DISTINCT id_propuesta)::int AS propuestas
    FROM ver
    GROUP BY id_vereda, nombre_vereda, nombre_municipio
    ORDER BY propuestas DESC, nombre_vereda
    LIMIT 6
  `;
  return rows.map((r) => ({
    id: pgInt(r.id),
    nombre: pgText(r.nombre),
    municipio: pgText(r.municipio),
    propuestas: pgInt(r.propuestas),
  }));
}

// -----------------------------------------------------------------------------
// Fallback demo (BD sin conexión)
// -----------------------------------------------------------------------------
function demoResumen(comp: ComponenteKey | null): ResumenComponente {
  const keys = keysDeComponente(comp);
  const indicadores: IndicadorResumen[] = keys.map((k) => {
    const m = INDICADORES_META[k];
    const accion = m.ca === "C3" ? "*" : m.ca.slice(2);
    return {
      key: k, label: m.label, actual: 0, meta: m.meta, unidad: m.unidad,
      pct: 0, cumplida: false, estado: "atrasada", accion,
    };
  });
  return {
    componente: comp,
    etiqueta: etiquetaComponente(comp),
    indicadores,
    cumplidas: 0,
    totalIndicadores: keys.length,
    pctGlobal: 0,
    conteos: {
      propuestas: 0, predios: 0, puntos: 0, lineas: 0, poligonos: 0,
      hectareas: 0, kilometros: 0, municipios: 0, veredas: 0,
    },
    porAccion: [],
    topMunicipios: [],
    topVeredas: [],
  };
}

// -----------------------------------------------------------------------------
// API pública
// -----------------------------------------------------------------------------
const getResumenComponenteImpl = async (
  componente?: string | null,
): Promise<ResumenComponente> => {
  const comp = normalizarComponente(componente);

  return withFallback(`resumenComponente:${comp ?? "ALL"}`, async () => {
    const [flat, conteos, porAccion, topMunicipios, topVeredas] = await Promise.all([
      getIndicadoresFlat(),
      getConteos(comp),
      getPorAccion(comp),
      getTopMunicipios(comp),
      getTopVeredas(comp),
    ]);

    const keys = keysDeComponente(comp);
    const indicadores: IndicadorResumen[] = keys.map((k) => {
      const m = INDICADORES_META[k];
      const f = flat[k];
      return {
        key: k,
        label: m.label,
        actual: f.actual,
        meta: m.meta,
        unidad: m.unidad,
        pct: f.pct,
        cumplida: f.cumplida,
        estado: estadoDePct(f.pct),
        accion: m.ca === "C3" ? "*" : m.ca.slice(2),
      };
    });

    const cumplidas = indicadores.filter((i) => i.cumplida).length;
    const pctGlobal = keys.length
      ? Math.round(keys.reduce((acc, k) => acc + Math.min(100, flat[k].pct), 0) / keys.length)
      : 0;

    return {
      componente: comp,
      etiqueta: etiquetaComponente(comp),
      indicadores,
      cumplidas,
      totalIndicadores: keys.length,
      pctGlobal,
      conteos,
      porAccion,
      topMunicipios,
      topVeredas,
    };
  }, demoResumen(comp));
};

export const getResumenComponente = cached(getResumenComponenteImpl, {
  tags: ["dashboard", "convenio", "metas", "mapa"],
  ttl: 60,
});

export const getResumenTodos = () => getResumenComponente(null);

// -----------------------------------------------------------------------------
// Avance ligero por componente (para el ribbon). Solo lee la vista de indicadores,
// sin queries espaciales.
// -----------------------------------------------------------------------------
export interface AvanceComponente {
  pct: number;
  cumplidas: number;
  total: number;
}

export async function getAvancePorComponente(): Promise<Record<ComponenteKey, AvanceComponente>> {
  const flat = await getIndicadoresFlat();
  const out = {} as Record<ComponenteKey, AvanceComponente>;
  for (const comp of ["C1", "C2", "C3"] as ComponenteKey[]) {
    const keys = keysDeComponente(comp);
    const cumplidas = keys.filter((k) => flat[k].cumplida).length;
    const pct = keys.length
      ? Math.round(keys.reduce((acc, k) => acc + Math.min(100, flat[k].pct), 0) / keys.length)
      : 0;
    out[comp] = { pct, cumplidas, total: keys.length };
  }
  return out;
}
