// =============================================================================
// Fase 6 — Indicadores y Relaciones de análisis
//
// 5 indicator tables (resumen por predio / municipio):
//   - sgs_ind_predio              → indicadores agregados por predio
//   - sgs_ind_ambiental_predio    → composición ambiental (áreas de cobertura)
//   - sgs_ind_hidrico_predio      → relación con recurso hídrico
//   - sgs_ind_intervencion_predio → acciones implementadas
//   - sgs_ind_municipio           → consolidado por municipio
//
// 5 junction tables (detalle por intersección espacial):
//   - sgs_rel_predio_cobertura        → cobertura CLC del predio
//   - sgs_rel_predio_bioma            → bioma IAvH
//   - sgs_rel_predio_paramos          → complejo de páramo
//   - sgs_rel_predio_zonificacion_pomca → zonificación POMCA
//   - sgs_rel_predio_zonificacion_rfp → reservas forestales protectoras
//
// Datos importados vía scripts/import_phase6.mjs desde el GDB (Fase 7).
// =============================================================================

import { sql, pgInt, pgNum, pgText } from "../db";
import { withFallback } from "./_helpers";
import { cached } from "./_cache";

// =============================================================================
// Tipos
// =============================================================================
export interface IndicadorPredio {
  id_predio: number;
  microcuenca: string | null;
  num_coberturas: number | null;
  cobertura_principal: string | null;
  bioma_principal: string | null;
  porc_paramo: number | null;
  categoria_pomca: string | null;
  nombre_rfp: string | null;
}

export interface IndicadorAmbientalPredio {
  id_predio: number;
  area_bosque_ha: number | null;
  area_pastos_ha: number | null;
  area_cultivos_ha: number | null;
  area_vegetacion_secundaria_ha: number | null;
  area_mosaico_ha: number | null;
  area_urbana_ha: number | null;
  area_otros_ha: number | null;
  area_bioma_ha: number | null;
  area_paramo_ha: number | null;
  tipo_cobertura_predominante: string | null;
  tipo_bioma_predominante: string | null;
}

export interface IndicadorHidricoPredio {
  id_predio: number;
  long_drenaje_m: number | null;
  distancia_drenaje_m: number | null;
  area_ronda_ha: number | null;
  porc_ronda: number | null;
}

export interface IndicadorIntervencionPredio {
  id_predio: number;
  num_propuestas_punto: number | null;
  num_propuestas_linea: number | null;
  num_propuestas_poligono: number | null;
  total_propuestas: number | null;
  area_intervenida_ha: number | null;
  longitud_intervenida_m: number | null;
  estado_predominante: string | null;
  componente_predominante: string | null;
  accion_predominante: string | null;
}

export interface IndicadorMunicipio {
  id_municipio: number;
  nombre_municipio: string;
  num_predios: number | null;
  area_total_ha: number | null;
  area_bosque_ha: number | null;
  area_pastos_ha: number | null;
  area_cultivos_ha: number | null;
  area_paramo_ha: number | null;
  num_predios_paramo: number | null;
  num_intervenciones: number | null;
  area_restaurada_ha: number | null;
  longitud_intervencion_m: number | null;
  area_ronda_ha: number | null;
}

export interface RelacionCobertura {
  id_cobertura: number;
  nombre_cobertura: string;
  area_interseccion_ha: number | null;
  porcentaje_predio: number | null;
}

export interface RelacionBioma {
  id_bioma: number;
  bioma_iavh: string;
  area_interseccion_ha: number | null;
  porcentaje_predio: number | null;
}

export interface RelacionParamo {
  id_paramos: number;
  nombre_paramo: string;
  complejo_nombre: string | null;
  area_interseccion_ha: number | null;
  porcentaje_predio: number | null;
}

export interface RelacionPomca {
  id_zonificacion_pomca: number;
  categoria_zonificacion: string;
  nomenclatura: string | null;
  descripcion: string | null;
  area_interseccion_ha: number | null;
  porcentaje_predio: number | null;
}

export interface RelacionRfp {
  id_zonificacion_rfp: number;
  categoria_zonificacion: string;
  nombre: string | null;
  sub_zonificacion: string | null;
  area_interseccion_ha: number | null;
  porcentaje_predio: number | null;
}

// =============================================================================
// Indicator tables (resumen por predio)
// =============================================================================
export async function getIndicadorByPredio(
  id_predio: number,
): Promise<IndicadorPredio | null> {
  return withFallback(`indicadorPredio:${id_predio}`, async () => {
    const [row] = await sql<{
      microcuenca: string | null;
      num_coberturas: number | string | null;
      cobertura_principal: string | null;
      bioma_principal: string | null;
      porc_paramo: number | string | null;
      categoria_pomca: string | null;
      nombre_rfp: string | null;
    }[]>`
      SELECT microcuenca, num_coberturas, cobertura_principal, bioma_principal,
             porc_paramo, categoria_pomca, nombre_rfp
      FROM   sgs_ind_predio
      WHERE  id_predio = ${id_predio}
    `;
    if (!row) return null;
    return {
      id_predio,
      microcuenca: row.microcuenca,
      num_coberturas: pgInt(row.num_coberturas),
      cobertura_principal: row.cobertura_principal,
      bioma_principal: row.bioma_principal,
      porc_paramo: row.porc_paramo !== null ? pgNum(row.porc_paramo) : null,
      categoria_pomca: row.categoria_pomca,
      nombre_rfp: row.nombre_rfp,
    };
  }, null);
}

export async function getIndicadorAmbientalByPredio(
  id_predio: number,
): Promise<IndicadorAmbientalPredio | null> {
  return withFallback(`indicadorAmb:${id_predio}`, async () => {
    const [row] = await sql<Record<string, unknown>[]>`
      SELECT * FROM sgs_ind_ambiental_predio WHERE id_predio = ${id_predio}
    `;
    if (!row) return null;
    return parseAmbiental(row, id_predio);
  }, null);
}

export async function getIndicadorHidricoByPredio(
  id_predio: number,
): Promise<IndicadorHidricoPredio | null> {
  return withFallback(`indicadorHid:${id_predio}`, async () => {
    const [row] = await sql<Record<string, unknown>[]>`
      SELECT * FROM sgs_ind_hidrico_predio WHERE id_predio = ${id_predio}
    `;
    if (!row) return null;
    return {
      id_predio,
      long_drenaje_m: numOrNull(row.long_drenaje_m),
      distancia_drenaje_m: numOrNull(row.distancia_drenaje_m),
      area_ronda_ha: numOrNull(row.area_ronda_ha),
      porc_ronda: numOrNull(row.porc_ronda),
    };
  }, null);
}

export async function getIndicadorIntervencionByPredio(
  id_predio: number,
): Promise<IndicadorIntervencionPredio | null> {
  return withFallback(`indicadorInt:${id_predio}`, async () => {
    const [row] = await sql<Record<string, unknown>[]>`
      SELECT * FROM sgs_ind_intervencion_predio WHERE id_predio = ${id_predio}
    `;
    if (!row) return null;
    return {
      id_predio,
      num_propuestas_punto: intOrNull(row.num_propuestas_punto),
      num_propuestas_linea: intOrNull(row.num_propuestas_linea),
      num_propuestas_poligono: intOrNull(row.num_propuestas_poligono),
      total_propuestas: intOrNull(row.total_propuestas),
      area_intervenida_ha: numOrNull(row.area_intervenida_ha),
      longitud_intervenida_m: numOrNull(row.longitud_intervenida_m),
      estado_predominante: pgText(row.estado_predominante as string | null),
      componente_predominante: pgText(row.componente_predominante as string | null),
      accion_predominante: pgText(row.accion_predominante as string | null),
    };
  }, null);
}

export async function getIndicadoresMunicipio(): Promise<IndicadorMunicipio[]> {
  return withFallback("indicadoresMunicipio", async () => {
    const rows = await sql<Record<string, unknown>[]>`
      SELECT m.id_municipio, m.nombre_municipio, im.*
      FROM   sgs_ind_municipio im
      JOIN   bcs_lpa_municipio m ON m.id_municipio = im.id_municipio
      ORDER  BY m.nombre_municipio
    `;
    return rows.map((r) => ({
      id_municipio: pgInt(r.id_municipio),
      nombre_municipio: pgText(r.nombre_municipio as string),
      num_predios: intOrNull(r.num_predios),
      area_total_ha: numOrNull(r.area_total_ha),
      area_bosque_ha: numOrNull(r.area_bosque_ha),
      area_pastos_ha: numOrNull(r.area_pastos_ha),
      area_cultivos_ha: numOrNull(r.area_cultivos_ha),
      area_paramo_ha: numOrNull(r.area_paramo_ha),
      num_predios_paramo: intOrNull(r.num_predios_paramo),
      num_intervenciones: intOrNull(r.num_intervenciones),
      area_restaurada_ha: numOrNull(r.area_restaurada_ha),
      longitud_intervencion_m: numOrNull(r.longitud_intervencion_m),
      area_ronda_ha: numOrNull(r.area_ronda_ha),
    }));
  }, []);
}

// =============================================================================
// Junction tables (detalle por intersección)
// =============================================================================
export async function getCoberturaByPredio(
  id_predio: number,
): Promise<RelacionCobertura[]> {
  return withFallback(`coberturaByPredio:${id_predio}`, async () => {
    const rows = await sql<Record<string, unknown>[]>`
      SELECT c.id_cobertura, c.nombre_cobertura,
             pc.area_interseccion_ha, pc.porcentaje_predio
      FROM   sgs_rel_predio_cobertura pc
      JOIN   sgs_amb_cobertura_clc c ON c.id_cobertura = pc.id_cobertura
      WHERE  pc.id_predio = ${id_predio}
      ORDER  BY pc.porcentaje_predio DESC NULLS LAST
    `;
    return rows.map((r) => ({
      id_cobertura: pgInt(r.id_cobertura),
      nombre_cobertura: pgText(r.nombre_cobertura as string),
      area_interseccion_ha: numOrNull(r.area_interseccion_ha),
      porcentaje_predio: numOrNull(r.porcentaje_predio),
    }));
  }, []);
}

export async function getBiomaByPredio(
  id_predio: number,
): Promise<RelacionBioma[]> {
  return withFallback(`biomaByPredio:${id_predio}`, async () => {
    const rows = await sql<Record<string, unknown>[]>`
      SELECT b.id_bioma, b.bioma_iavh,
             pb.area_interseccion_ha, pb.porcentaje_predio
      FROM   sgs_rel_predio_bioma pb
      JOIN   sgs_amb_bioma b ON b.id_bioma = pb.id_bioma
      WHERE  pb.id_predio = ${id_predio}
      ORDER  BY pb.porcentaje_predio DESC NULLS LAST
    `;
    return rows.map((r) => ({
      id_bioma: pgInt(r.id_bioma),
      bioma_iavh: pgText(r.bioma_iavh as string),
      area_interseccion_ha: numOrNull(r.area_interseccion_ha),
      porcentaje_predio: numOrNull(r.porcentaje_predio),
    }));
  }, []);
}

export async function getParamoByPredio(
  id_predio: number,
): Promise<RelacionParamo[]> {
  return withFallback(`paramoByPredio:${id_predio}`, async () => {
    const rows = await sql<Record<string, unknown>[]>`
      SELECT p.id_paramos, p.nombre_paramo, p.complejo_nombre,
             pp.area_interseccion_ha, pp.porcentaje_predio
      FROM   sgs_rel_predio_paramos pp
      JOIN   sgs_amb_paramos p ON p.id_paramos = pp.id_paramos
      WHERE  pp.id_predio = ${id_predio}
      ORDER  BY pp.porcentaje_predio DESC NULLS LAST
    `;
    return rows.map((r) => ({
      id_paramos: pgInt(r.id_paramos),
      nombre_paramo: pgText(r.nombre_paramo as string),
      complejo_nombre: pgText(r.complejo_nombre as string | null),
      area_interseccion_ha: numOrNull(r.area_interseccion_ha),
      porcentaje_predio: numOrNull(r.porcentaje_predio),
    }));
  }, []);
}

export async function getPomcaByPredio(
  id_predio: number,
): Promise<RelacionPomca[]> {
  return withFallback(`pomcaByPredio:${id_predio}`, async () => {
    const rows = await sql<Record<string, unknown>[]>`
      SELECT z.id_zonificacion_pomca, z.categoria_zonificacion,
             z.nomenclatura, z.descripcion,
             pz.area_interseccion_ha, pz.porcentaje_predio
      FROM   sgs_rel_predio_zonificacion_pomca pz
      JOIN   sgs_amb_zonificacion_pomca z ON z.id_zonificacion_pomca = pz.id_zonificacion_pomca
      WHERE  pz.id_predio = ${id_predio}
      ORDER  BY pz.porcentaje_predio DESC NULLS LAST
    `;
    return rows.map((r) => ({
      id_zonificacion_pomca: pgInt(r.id_zonificacion_pomca),
      categoria_zonificacion: pgText(r.categoria_zonificacion as string),
      nomenclatura: pgText(r.nomenclatura as string | null),
      descripcion: pgText(r.descripcion as string | null),
      area_interseccion_ha: numOrNull(r.area_interseccion_ha),
      porcentaje_predio: numOrNull(r.porcentaje_predio),
    }));
  }, []);
}

export async function getRfpByPredio(
  id_predio: number,
): Promise<RelacionRfp[]> {
  return withFallback(`rfpByPredio:${id_predio}`, async () => {
    const rows = await sql<Record<string, unknown>[]>`
      SELECT r.id_zonificacion_rfp, r.categoria_zonificacion,
             r.nombre, r.sub_zonificacion,
             pr.area_interseccion_ha, pr.porcentaje_predio
      FROM   sgs_rel_predio_zonificacion_rfp pr
      JOIN   sgs_amb_zonificacion_rfp r ON r.id_zonificacion_rfp = pr.id_zonificacion_rfp
      WHERE  pr.id_predio = ${id_predio}
      ORDER  BY pr.porcentaje_predio DESC NULLS LAST
    `;
    return rows.map((r) => ({
      id_zonificacion_rfp: pgInt(r.id_zonificacion_rfp),
      categoria_zonificacion: pgText(r.categoria_zonificacion as string),
      nombre: pgText(r.nombre as string | null),
      sub_zonificacion: pgText(r.sub_zonificacion as string | null),
      area_interseccion_ha: numOrNull(r.area_interseccion_ha),
      porcentaje_predio: numOrNull(r.porcentaje_predio),
    }));
  }, []);
}

// =============================================================================
// Aggregate: dashboard con indicadores Fase 6
// =============================================================================
export interface PredioAnalisisCompleto {
  indicador: IndicadorPredio | null;
  ambiental: IndicadorAmbientalPredio | null;
  hidrico: IndicadorHidricoPredio | null;
  intervencion: IndicadorIntervencionPredio | null;
  coberturas: RelacionCobertura[];
  biomas: RelacionBioma[];
  paramos: RelacionParamo[];
  pomcas: RelacionPomca[];
  rfps: RelacionRfp[];
}

const getPredioAnalisisCompletoImpl = async (
  id_predio: number,
): Promise<PredioAnalisisCompleto> => {
  return withFallback(`predioAnalisisCompleto:${id_predio}`, async () => {
    const [
      indicador, ambiental, hidrico, intervencion,
      coberturas, biomas, paramos, pomcas, rfps,
    ] = await Promise.all([
      getIndicadorByPredio(id_predio),
      getIndicadorAmbientalByPredio(id_predio),
      getIndicadorHidricoByPredio(id_predio),
      getIndicadorIntervencionByPredio(id_predio),
      getCoberturaByPredio(id_predio),
      getBiomaByPredio(id_predio),
      getParamoByPredio(id_predio),
      getPomcaByPredio(id_predio),
      getRfpByPredio(id_predio),
    ]);
    return { indicador, ambiental, hidrico, intervencion, coberturas, biomas, paramos, pomcas, rfps };
  }, {
    indicador: null, ambiental: null, hidrico: null, intervencion: null,
    coberturas: [], biomas: [], paramos: [], pomcas: [], rfps: [],
  });
};
export const getPredioAnalisisCompleto = cached(getPredioAnalisisCompletoImpl, {
  tags: ["analisis", "fase6"],
  ttl: 60,
});

// =============================================================================
// Helpers
// =============================================================================
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : null;
}
function intOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function parseAmbiental(row: Record<string, unknown>, id_predio: number): IndicadorAmbientalPredio {
  return {
    id_predio,
    area_bosque_ha: numOrNull(row.area_bosque_ha),
    area_pastos_ha: numOrNull(row.area_pastos_ha),
    area_cultivos_ha: numOrNull(row.area_cultivos_ha),
    area_vegetacion_secundaria_ha: numOrNull(row.area_vegetacion_secundaria_ha),
    area_mosaico_ha: numOrNull(row.area_mosaico_ha),
    area_urbana_ha: numOrNull(row.area_urbana_ha),
    area_otros_ha: numOrNull(row.area_otros_ha),
    area_bioma_ha: numOrNull(row.area_bioma_ha),
    area_paramo_ha: numOrNull(row.area_paramo_ha),
    tipo_cobertura_predominante: pgText(row.tipo_cobertura_predominante as string | null),
    tipo_bioma_predominante: pgText(row.tipo_bioma_predominante as string | null),
  };
}
