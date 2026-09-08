// =============================================================================
// Buffer — análisis espacial con ST_Buffer + ST_Intersects
//
// Sprint 18.3 — herramienta "Buffer" del mapa. Recibe una geometría (POINT,
// LINESTRING o POLYGON) y una distancia en metros, y devuelve:
//   1. La geometría del buffer (POLYGON) como GeoJSON
//   2. Conteo de features intersectadas por capa (predios, propuestas,
//      quebradas, drenaje, vías)
//
// Usa SRID 4686 con `::geography` para que la distancia del buffer sea
// en metros sobre el elipsoide (no en grados).
//
// Ejemplo de uso:
//   POST /api/analysis/buffer
//   { "geometry": { "type": "Point", "coordinates": [-73.83, 4.93] },
//     "distance": 100, "units": "meters" }
//
//   Response:
//   { "buffer": { "type": "Polygon", "coordinates": [...] },
//     "buffer_area_ha": 3.14,
//     "results": { "predios": 12, "propuestas": 8, "quebradas": 2, ... } }
// =============================================================================

import { sql, pgNum, pgInt, pgText } from "../db";

export type BufferGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "LineString"; coordinates: [number, number][] }
  | { type: "Polygon"; coordinates: [number, number][][] };

export interface BufferResult {
  buffer: BufferGeometry;
  buffer_area_ha: number;
  results: {
    predios: number;
    propuestas: number;
    propuesta_puntos: number;
    quebradas: number;
    drenaje: number;
    vias: number;
  };
}

const SUPPORTED_TYPES = new Set(["Point", "LineString", "Polygon"]);

function isValidCoord(c: unknown): c is [number, number] {
  return (
    Array.isArray(c) &&
    c.length === 2 &&
    typeof c[0] === "number" &&
    typeof c[1] === "number" &&
    c[0] >= -180 &&
    c[0] <= 180 &&
    c[1] >= -90 &&
    c[1] <= 90
  );
}

function isValidGeometry(g: unknown): g is BufferGeometry {
  if (!g || typeof g !== "object") return false;
  const geo = g as { type?: string; coordinates?: unknown };
  if (!geo.type || !SUPPORTED_TYPES.has(geo.type)) return false;
  if (!geo.coordinates) return false;
  if (geo.type === "Point") return isValidCoord(geo.coordinates);
  if (geo.type === "LineString")
    return Array.isArray(geo.coordinates) && geo.coordinates.every(isValidCoord);
  if (geo.type === "Polygon") {
    if (!Array.isArray(geo.coordinates)) return false;
    return geo.coordinates.every(
      (ring) => Array.isArray(ring) && ring.every(isValidCoord),
    );
  }
  return false;
}

function geoJsonToWkt(g: BufferGeometry): string {
  if (g.type === "Point") {
    return `POINT(${g.coordinates[0]} ${g.coordinates[1]})`;
  }
  if (g.type === "LineString") {
    return `LINESTRING(${g.coordinates.map((c) => `${c[0]} ${c[1]}`).join(", ")})`;
  }
  // Polygon
  return `POLYGON((${g.coordinates
    .map((ring) => ring.map((c) => `${c[0]} ${c[1]}`).join(", "))
    .join("), (")}))`;
}

export const analyzeBuffer = async (
  geometry: BufferGeometry,
  distance: number,
): Promise<BufferResult> => {
  if (!isValidGeometry(geometry)) {
    throw new Error("Geometría inválida");
  }
  if (distance <= 0 || distance > 50_000) {
    throw new Error("Distancia debe estar entre 1 y 50000 metros");
  }

  const wkt = geoJsonToWkt(geometry);

  // Una sola query: genera el buffer, cuenta features por capa, devuelve
  // buffer como GeoJSON y métricas. Subqueries en paralelo con UNION ALL.
  // ST_Buffer sobre ::geography → metros reales sobre el elipsoide.
  const rows = await sql<
    Array<{
      buffer_geojson: string;
      buffer_area_ha: number | string;
      n_predios: number;
      n_propuestas: number;
      n_propuesta_puntos: number;
      n_quebradas: number;
      n_drenaje: number;
      n_vias: number;
    }>
  >`
    WITH geom AS (
      SELECT ST_GeomFromText(${wkt}, 4686) AS g
    ),
    buf AS (
      SELECT ST_Buffer(g::geography, ${distance})::geometry(Polygon, 4686) AS geom
      FROM geom
    )
    SELECT
      ST_AsGeoJSON(buf.geom) AS buffer_geojson,
      round((ST_Area(buf.geom::geography) / 10000)::numeric, 2) AS buffer_area_ha,
      -- Predios que intersectan el buffer
      (SELECT count(*)::int FROM sgs_pre_predio pr, buf WHERE ST_Intersects(pr.geom, buf.geom)) AS n_predios,
      -- Propuestas (súper con id_predio o id_quebrada) — asociado a feature intersectada
      (SELECT count(DISTINCT pp.id_propuesta)::int
         FROM sgs_pro_propuesta pp
         JOIN sgs_pre_predio pr ON pr.id_predio = pp.id_predio, buf
         WHERE ST_Intersects(pr.geom, buf.geom)) AS n_propuestas,
      -- Propuestas hijas (puntos con geom)
      (SELECT count(*)::int FROM sgs_pro_propuesta_punto pt, buf WHERE ST_Intersects(pt.geom, buf.geom)) AS n_propuesta_puntos,
      -- Quebradas
      (SELECT count(*)::int FROM bcs_dh_quebrada q, buf WHERE ST_Intersects(q.geom, buf.geom)) AS n_quebradas,
      -- Drenaje (simple + doble)
      (SELECT count(*)::int FROM sgs_inf_drenaje_simple ds, buf WHERE ST_Intersects(ds.geom, buf.geom))
        + (SELECT count(*)::int FROM sgs_inf_drenaje_doble dd, buf WHERE ST_Intersects(dd.geom, buf.geom)) AS n_drenaje,
      -- Vías
      (SELECT count(*)::int FROM sgs_inf_via v, buf WHERE ST_Intersects(v.geom, buf.geom)) AS n_vias
    FROM buf
  `;

  const row = rows[0];
  if (!row) {
    throw new Error("No se pudo generar el buffer");
  }

  return {
    buffer: JSON.parse(row.buffer_geojson) as BufferGeometry,
    buffer_area_ha: pgNum(row.buffer_area_ha),
    results: {
      predios: pgInt(row.n_predios),
      propuestas: pgInt(row.n_propuestas),
      propuesta_puntos: pgInt(row.n_propuesta_puntos),
      quebradas: pgInt(row.n_quebradas),
      drenaje: pgInt(row.n_drenaje),
      vias: pgInt(row.n_vias),
    },
  };
};
