// =============================================================================
// spatial-select — selección espacial con rectángulo
//
// Sprint 18.4 — herramienta "Seleccionar features" del mapa. El usuario
// dibuja un rectángulo (click + drag) y el endpoint devuelve el conteo de
// features dentro por capa, igual que buffer pero con ST_MakeEnvelope en
// lugar de ST_Buffer.
//
// Input: 2 corners del rectángulo (lng/lat)
// Output: counts por capa
// =============================================================================

import { sql, pgInt } from "../db";

export interface SpatialSelectResult {
  bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  area_km2: number;
  results: {
    predios: number;
    propuestas: number;
    propuesta_puntos: number;
    propuesta_lineas: number;
    propuesta_poligonos: number;
    quebradas: number;
    drenaje: number;
    vias: number;
    municipios: number;
    veredas: number;
  };
}

/** Normaliza un bbox (puede venir con esquinas invertidas) y lanza si excede el límite. */
export function normalizeBbox(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
  maxDeg = 5,
): { xmin: number; ymin: number; xmax: number; ymax: number } {
  const xmin = Math.min(minLng, maxLng);
  const xmax = Math.max(minLng, maxLng);
  const ymin = Math.min(minLat, maxLat);
  const ymax = Math.max(minLat, maxLat);
  const widthDeg = xmax - xmin;
  const heightDeg = ymax - ymin;
  if (widthDeg > maxDeg || heightDeg > maxDeg) {
    throw new Error(`BBox demasiado grande (máx ${maxDeg}° x ${maxDeg}°)`);
  }
  return { xmin, ymin, xmax, ymax };
}

/** Calcula el área aproximada en km² de un bbox geográfico chico. */
export function bboxAreaKm2(
  xmin: number,
  ymin: number,
  xmax: number,
  ymax: number,
): number {
  const widthDeg = xmax - xmin;
  const heightDeg = ymax - ymin;
  const avgLat = (ymin + ymax) / 2;
  const widthKm = widthDeg * 111.32 * Math.cos((avgLat * Math.PI) / 180);
  const heightKm = heightDeg * 110.57;
  return widthKm * heightKm;
}

export const selectByBbox = async (
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
): Promise<SpatialSelectResult> => {
  const { xmin, ymin, xmax, ymax } = normalizeBbox(minLng, minLat, maxLng, maxLat);

  const rows = await sql<
    Array<{
      n_predios: number;
      n_propuestas: number;
      n_propuesta_puntos: number;
      n_propuesta_lineas: number;
      n_propuesta_poligonos: number;
      n_quebradas: number;
      n_drenaje: number;
      n_vias: number;
      n_municipios: number;
      n_veredas: number;
    }>
  >`
    WITH bbox AS (
      SELECT ST_MakeEnvelope(
        ${xmin}, ${ymin}, ${xmax}, ${ymax}, 4686
      ) AS geom
    )
    SELECT
      (SELECT count(*)::int FROM sgs_pre_predio pr, bbox WHERE ST_Intersects(pr.geom, bbox.geom)) AS n_predios,
      (SELECT count(*)::int FROM sgs_pro_propuesta pp
         JOIN sgs_pre_predio pr ON pr.id_predio = pp.id_predio, bbox
         WHERE ST_Intersects(pr.geom, bbox.geom)) AS n_propuestas,
      (SELECT count(*)::int FROM sgs_pro_propuesta_punto pt, bbox WHERE ST_Intersects(pt.geom, bbox.geom)) AS n_propuesta_puntos,
      (SELECT count(*)::int FROM sgs_pro_propuesta_linea pl, bbox WHERE ST_Intersects(pl.geom, bbox.geom)) AS n_propuesta_lineas,
      (SELECT count(*)::int FROM sgs_pro_propuesta_poligono pp, bbox WHERE ST_Intersects(pp.geom, bbox.geom)) AS n_propuesta_poligonos,
      (SELECT count(*)::int FROM bcs_dh_quebrada q, bbox WHERE ST_Intersects(q.geom, bbox.geom)) AS n_quebradas,
      (SELECT count(*)::int FROM sgs_inf_drenaje_simple ds, bbox WHERE ST_Intersects(ds.geom, bbox.geom))
        + (SELECT count(*)::int FROM sgs_inf_drenaje_doble dd, bbox WHERE ST_Intersects(dd.geom, bbox.geom)) AS n_drenaje,
      (SELECT count(*)::int FROM sgs_inf_via v, bbox WHERE ST_Intersects(v.geom, bbox.geom)) AS n_vias,
      (SELECT count(*)::int FROM bcs_lpa_municipio m, bbox WHERE ST_Intersects(m.geom, bbox.geom)) AS n_municipios,
      (SELECT count(*)::int FROM bcs_lpa_vereda v, bbox WHERE ST_Intersects(v.geom, bbox.geom)) AS n_veredas
  `;

  const row = rows[0];

  return {
    bbox: { minLng: xmin, minLat: ymin, maxLng: xmax, maxLat: ymax },
    area_km2: bboxAreaKm2(xmin, ymin, xmax, ymax),
    results: {
      predios: pgInt(row.n_predios),
      propuestas: pgInt(row.n_propuestas),
      propuesta_puntos: pgInt(row.n_propuesta_puntos),
      propuesta_lineas: pgInt(row.n_propuesta_lineas),
      propuesta_poligonos: pgInt(row.n_propuesta_poligonos),
      quebradas: pgInt(row.n_quebradas),
      drenaje: pgInt(row.n_drenaje),
      vias: pgInt(row.n_vias),
      municipios: pgInt(row.n_municipios),
      veredas: pgInt(row.n_veredas),
    },
  };
};
