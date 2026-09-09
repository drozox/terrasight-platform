// =============================================================================
// MVT — Mapbox Vector Tiles para capas geográficas
//
// Sprint 18.5 — UX-31 (audit 2026-07-24) hotfix. Reemplaza la carga de GeoJSON
// completo (cientos de miles de features → MB de JSON) por tiles vectoriales
// binarios que solo contienen las features visibles en el viewport.
//
// Beneficios:
//   - Payload: 1-50 KB por tile vs 5-15 MB de GeoJSON completo
//   - Render: GPU-accelerated en MapLibre/Mapbox/Leaflet.VectorGrid
//   - Cache: tiles cacheables 1h-7d según capa (estáticas)
//   - UX-31: drenajes (2,985 features) ya no congelan la UI al togglear
//
// PostGIS functions:
//   - ST_TileEnvelope(z, x, y) → bounding box del tile en WGS84
//   - ST_AsMVTGeom(geom, envelope, extent, buffer, clip_geom) → geometría tile-coords
//   - ST_AsMVT(geom, name) → protobuf binario
//
// Whitelist: solo capas conocidas. Cualquier otra devuelve 404.
// =============================================================================

import { sql } from "../db";

/** Whitelist de capas que se pueden servir como MVT. */
export const MVT_LAYERS = [
  "predios",
  "vias",
  "drenajes",
  "propuestas",
  "municipios",
  "veredas",
] as const;
export type MvtLayer = (typeof MVT_LAYERS)[number];

export function isMvtLayer(s: string): s is MvtLayer {
  return (MVT_LAYERS as readonly string[]).includes(s);
}

/** Configuración por capa: tabla + columnas opcionales. */
const LAYER_CONFIG: Record<
  MvtLayer,
  { table: string; geomCol: string; idCol: string; labelCol: string; layerName: string }
> = {
  predios: {
    table: "sgs_pre_predio",
    geomCol: "geom",
    idCol: "id_predio",
    labelCol: "nombre_predio",
    layerName: "predios",
  },
  vias: {
    table: "sgs_inf_via",
    geomCol: "geom",
    idCol: "id_via",
    labelCol: "tipo_via",
    layerName: "vias",
  },
  drenajes: {
    table: "sgs_inf_drenaje_simple",
    geomCol: "geom",
    idCol: "id_drenaje_simple",
    labelCol: "nombre_geografico",
    layerName: "drenajes",
  },
  propuestas: {
    table: "sgs_pro_propuesta_linea",
    geomCol: "geom",
    idCol: "id_propuesta",
    labelCol: "actividad",
    layerName: "propuestas",
  },
  municipios: {
    table: "bcs_lpa_municipio",
    geomCol: "geom",
    idCol: "id_municipio",
    labelCol: "nombre_municipio",
    layerName: "municipios",
  },
  veredas: {
    table: "bcs_lpa_vereda",
    geomCol: "geom",
    idCol: "id_vereda",
    labelCol: "nombre_vereda",
    layerName: "veredas",
  },
};

/**
 * Genera un tile vectorial (MVT protobuf) para la capa solicitada.
 * Retorna un Buffer binario listo para servir como application/x-protobuf.
 *
 * Importante: ST_TileEnvelope() retorna en EPSG:3857 (Web Mercator, MVT standard).
 * Nuestras tablas están en SRID 4686 (geográfico). Hay que transformar:
 *   - el envelope de 3857 → 4686 para el WHERE ST_Intersects (usa índice GIST)
 *   - la geometría de 4686 → 3857 para ST_AsMVTGeom (MVT requiere 3857)
 *
 * @param layer  capa whitelisteada
 * @param z      zoom level (0-22)
 * @param x      column (0-2^z-1)
 * @param y      row (0-2^z-1)
 */
export async function fetchMvtTile(
  layer: MvtLayer,
  z: number,
  x: number,
  y: number,
): Promise<Buffer> {
  const cfg = LAYER_CONFIG[layer];

  const result = await sql<{ mvt: Buffer }[]>`
    WITH tile AS (
      SELECT
        ST_TileEnvelope(${z}, ${x}, ${y}) AS env_3857,
        ST_Transform(ST_TileEnvelope(${z}, ${x}, ${y}), 4686) AS env_4686
    ),
    mvt_data AS (
      SELECT
        ST_AsMVTGeom(
          ST_Transform(t.${sql(cfg.geomCol)}, 3857),
          tile.env_3857,
          4096,    -- extent (MVT standard)
          256,     -- buffer (clips a neighboring tiles por 8 px)
          true     -- clip_geom (recorta a la envoltura del tile)
        ) AS geom,
        t.${sql(cfg.idCol)}::int AS id,
        t.${sql(cfg.labelCol)} AS nombre
      FROM ${sql(cfg.table)} t, tile
      WHERE t.${sql(cfg.geomCol)} IS NOT NULL
        AND ST_Intersects(t.${sql(cfg.geomCol)}, tile.env_4686)
    )
    SELECT ST_AsMVT(mvt_data, ${cfg.layerName}, 4096) AS mvt
    FROM mvt_data
  `;

  // ST_AsMVT retorna NULL si no hay features en el tile
  const row = result[0];
  if (!row || !row.mvt) {
    return Buffer.alloc(0);
  }
  return row.mvt as Buffer;
}
