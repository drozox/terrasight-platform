import { sql } from "../db";
import { unstable_cache } from "next/cache";

// =============================================================================
// GeoJSON helpers — convierte cada tabla geografía a FeatureCollection
// server-side usando ST_AsGeoJSON de PostGIS. Se cachean con unstable_cache
// para evitar recargar la BD en cada toggle del panel del mapa.
// =============================================================================

type FeatureCollection = GeoJSON.FeatureCollection;

/** Municipios — polígonos administrativos. */
export const getMunicipiosGeoJSON = unstable_cache(
  async (): Promise<FeatureCollection> => {
    const rows = await sql<{ id: number; nombre: string; departamento: string; geom: string }[]>`
      SELECT id_municipio AS id, nombre_municipio AS nombre, departamento,
             ST_AsGeoJSON(geom) AS geom
      FROM bcs_lpa_municipio
      WHERE geom IS NOT NULL
      ORDER BY nombre_municipio;
    `;
    return {
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        id: r.id,
        properties: { id: r.id, nombre: r.nombre, departamento: r.departamento, layer: "municipios" },
        geometry: JSON.parse(r.geom) as GeoJSON.Geometry,
      })),
    };
  },
  ["geo-municipios"],
  { revalidate: 300, tags: ["mapa"] },
);

/** Veredas — polígonos administrativos. */
export const getVeredasGeoJSON = unstable_cache(
  async (): Promise<FeatureCollection> => {
    const rows = await sql<{ id: number; nombre: string; id_municipio: number; geom: string }[]>`
      SELECT id_vereda AS id, nombre_vereda AS nombre, id_municipio,
             ST_AsGeoJSON(geom) AS geom
      FROM bcs_lpa_vereda
      WHERE geom IS NOT NULL
      ORDER BY nombre_vereda;
    `;
    return {
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        id: r.id,
        properties: { id: r.id, nombre: r.nombre, id_municipio: r.id_municipio, layer: "veredas" },
        geometry: JSON.parse(r.geom) as GeoJSON.Geometry,
      })),
    };
  },
  ["geo-veredas"],
  { revalidate: 300, tags: ["mapa"] },
);

/** Predios — polígonos catastrales. */
export const getPrediosGeoJSON = unstable_cache(
  async (): Promise<FeatureCollection> => {
    const rows = await sql<{ id: number; nombre: string; area_ha: number; geom: string }[]>`
      SELECT id_predio AS id, nombre_predio AS nombre, area_ha,
             ST_AsGeoJSON(geom) AS geom
      FROM sgs_pre_predio
      WHERE geom IS NOT NULL
      ORDER BY id_predio;
    `;
    return {
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        id: r.id,
        properties: { id: r.id, nombre: r.nombre, areaHa: Number(r.area_ha), layer: "predios" },
        geometry: JSON.parse(r.geom) as GeoJSON.Geometry,
      })),
    };
  },
  ["geo-predios"],
  { revalidate: 300, tags: ["mapa"] },
);

/** Biomas — polígonos de cobertura vegetal IAVH. */
export const getBiomasGeoJSON = unstable_cache(
  async (): Promise<FeatureCollection> => {
    const rows = await sql<{ id: number; nombre: string; area_ha: number; geom: string }[]>`
      SELECT id_bioma AS id, bioma_iavh AS nombre, area_ha,
             ST_AsGeoJSON(geom) AS geom
      FROM sgs_amb_bioma
      WHERE geom IS NOT NULL
      ORDER BY bioma_iavh;
    `;
    return {
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        id: r.id,
        properties: { id: r.id, nombre: r.nombre, areaHa: Number(r.area_ha), layer: "biomas" },
        geometry: JSON.parse(r.geom) as GeoJSON.Geometry,
      })),
    };
  },
  ["geo-biomas"],
  { revalidate: 300, tags: ["mapa"] },
);

/** Drenajes simples — líneas (quebradas). */
export const getDrenajesSimplesGeoJSON = unstable_cache(
  async (): Promise<FeatureCollection> => {
    const rows = await sql<{ id: number; nombre: string; estado: string; geom: string }[]>`
      SELECT id_drenaje_simple AS id, nombre_geografico AS nombre, estado_drenaje AS estado,
             ST_AsGeoJSON(geom) AS geom
      FROM sgs_inf_drenaje_simple
      WHERE geom IS NOT NULL
      ORDER BY id_drenaje_simple;
    `;
    return {
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        id: r.id,
        properties: { id: r.id, nombre: r.nombre, estado: r.estado, layer: "drenajes" },
        geometry: JSON.parse(r.geom) as GeoJSON.Geometry,
      })),
    };
  },
  ["geo-drenajes-simples"],
  { revalidate: 300, tags: ["mapa"] },
);

/** Vías — líneas. */
export const getViasGeoJSON = unstable_cache(
  async (): Promise<FeatureCollection> => {
    const rows = await sql<{ id: number; tipo: string; estado: string; geom: string }[]>`
      SELECT id_via AS id, tipo_via AS tipo, estado_superficie AS estado,
             ST_AsGeoJSON(geom) AS geom
      FROM sgs_inf_via
      WHERE geom IS NOT NULL
      ORDER BY id_via;
    `;
    return {
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        id: r.id,
        properties: { id: r.id, tipo: r.tipo, estado: r.estado, layer: "vias" },
        geometry: JSON.parse(r.geom) as GeoJSON.Geometry,
      })),
    };
  },
  ["geo-vias"],
  { revalidate: 300, tags: ["mapa"] },
);

/** Propuestas línea — polilíneas de propuestas de aislamiento. */
export const getPropuestasLineaGeoJSON = unstable_cache(
  async (): Promise<FeatureCollection> => {
    const rows = await sql<{ id: number; actividad: string; longitud_km: number; geom: string }[]>`
      SELECT id_propuesta AS id, actividad, longitud_km,
             ST_AsGeoJSON(geom) AS geom
      FROM sgs_pro_propuesta_linea
      WHERE geom IS NOT NULL
      ORDER BY id_propuesta;
    `;
    return {
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        id: r.id,
        properties: { id: r.id, actividad: r.actividad, longitudKm: Number(r.longitud_km), layer: "propuestas" },
        geometry: JSON.parse(r.geom) as GeoJSON.Geometry,
      })),
    };
  },
  ["geo-propuestas-linea"],
  { revalidate: 300, tags: ["mapa"] },
);
