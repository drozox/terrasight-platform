import { sql } from "../db";
import { unstable_cache } from "next/cache";
import { normalizarAccion, accionDef, type AccionCode } from "../acciones";

// =============================================================================
// GeoJSON helpers — convierte cada tabla geografía a FeatureCollection
// server-side usando ST_AsGeoJSON de PostGIS. Se cachean con unstable_cache
// para evitar recargar la BD en cada toggle del panel del mapa.
// =============================================================================

type FeatureCollection = GeoJSON.FeatureCollection;

/**
 * Municipios donde ocurre una acción: por el predio→vereda→municipio de sus
 * propuestas + por intersección espacial de las geometrías (línea/polígono/punto).
 */
function accionMunicipiosSub(componente: string | null, accion: string | null) {
  const { compCond, accionCond } = filtroProps(componente, accion);
  return sql`(
    SELECT DISTINCT v.id_municipio
    FROM sgs_pro_propuesta pp
      JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      JOIN sgs_pre_predio     p ON p.id_predio     = pp.id_predio
      JOIN bcs_lpa_vereda     v ON v.id_vereda     = p.id_vereda
    WHERE TRUE ${compCond} ${accionCond}
    UNION
    SELECT DISTINCT m.id_municipio
    FROM sgs_pro_propuesta_linea pl
      JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pl.id_propuesta
      JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
      JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
      JOIN bcs_lpa_municipio  m  ON ST_Intersects(m.geom, pl.geom)
    WHERE TRUE ${compCond} ${accionCond} AND pp.id_predio IS NULL
    UNION
    SELECT DISTINCT m.id_municipio
    FROM sgs_pro_propuesta_poligono pq
      JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pq.id_propuesta
      JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
      JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
      JOIN bcs_lpa_municipio  m  ON ST_Intersects(m.geom, pq.geom)
    WHERE TRUE ${compCond} ${accionCond} AND pp.id_predio IS NULL
    UNION
    SELECT DISTINCT m.id_municipio
    FROM sgs_pro_propuesta_punto pt
      JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pt.id_propuesta
      JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
      JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
      JOIN bcs_lpa_municipio  m  ON ST_Intersects(m.geom, pt.geom)
    WHERE TRUE ${compCond} ${accionCond} AND pp.id_predio IS NULL
  )`;
}

/** Filtro de capas base (columnas `id_municipio`) al municipio de la acción. */
function filtroMunicipioAccion(componente: string | null, accion: string | null) {
  if (!componente && !accion) return sql``;
  const code = accion ? normalizarAccion(accion) : null;
  if (accion && !code) return sql``;
  return sql`AND id_municipio IN ${accionMunicipiosSub(componente, code)}`;
}

/** Municipios — polígonos administrativos. */
export const getMunicipiosGeoJSON = unstable_cache(
  async (componente: string | null = null, accion: string | null = null): Promise<FeatureCollection> => {
    const rows = await sql<{ id: number; nombre: string; departamento: string; geom: string }[]>`
      SELECT id_municipio AS id, nombre_municipio AS nombre, departamento,
             ST_AsGeoJSON(geom) AS geom
      FROM bcs_lpa_municipio
      WHERE geom IS NOT NULL ${filtroMunicipioAccion(componente, accion)}
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
  async (componente: string | null = null, accion: string | null = null): Promise<FeatureCollection> => {
    const rows = await sql<{ id: number; nombre: string; id_municipio: number; geom: string }[]>`
      SELECT id_vereda AS id, nombre_vereda AS nombre, id_municipio,
             ST_AsGeoJSON(geom) AS geom
      FROM bcs_lpa_vereda
      WHERE geom IS NOT NULL ${filtroMunicipioAccion(componente, accion)}
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

/** Predios — polígonos catastrales (filtrable por componente/acción). */
export const getPrediosGeoJSON = unstable_cache(
  async (componente: string | null = null, accion: string | null = null): Promise<FeatureCollection> => {
    let filtro = sql``;
    if (componente || accion) {
      const { compCond, accionCond } = filtroProps(componente, accion);
      // Un predio pertenece a la acción si tiene una propuesta vinculada
      // (pp.id_predio = p.id_predio) O si alguna de sus geometrías (línea,
      // polígono o punto) intersecta el predio. El segundo caso es clave para
      // acciones cuyas propuestas son puntos sin predio (ej. C2A2: Obras de
      // captación / Estación limnimétrica).
      filtro = sql`AND EXISTS (
        SELECT 1 FROM sgs_pro_propuesta pp
        JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
        JOIN sgs_com_componente c ON c.id_componente = a.id_componente
        WHERE TRUE ${compCond} ${accionCond}
          AND (
            pp.id_predio = p.id_predio
            OR EXISTS (SELECT 1 FROM sgs_pro_propuesta_linea    pl WHERE pl.id_propuesta = pp.id_propuesta AND pl.geom IS NOT NULL AND ST_Intersects(pl.geom, p.geom))
            OR EXISTS (SELECT 1 FROM sgs_pro_propuesta_poligono pq WHERE pq.id_propuesta = pp.id_propuesta AND pq.geom IS NOT NULL AND ST_Intersects(pq.geom, p.geom))
            OR EXISTS (SELECT 1 FROM sgs_pro_propuesta_punto    pt WHERE pt.id_propuesta = pp.id_propuesta AND pt.geom IS NOT NULL AND ST_Intersects(pt.geom, p.geom))
          )
      )`;
    }
    const rows = await sql<{ id: number; nombre: string; area_ha: number; geom: string }[]>`
      SELECT p.id_predio AS id, p.nombre_predio AS nombre, p.area_ha,
             ST_AsGeoJSON(
               CASE WHEN ST_SRID(p.geom) = 4326 THEN p.geom
                    ELSE ST_Transform(p.geom, 4326) END
             ) AS geom
      FROM sgs_pre_predio p
      WHERE p.geom IS NOT NULL ${filtro}
      ORDER BY p.id_predio;
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

/**
 * Un solo predio por id (para el filtro territorial de INICIO: foco + fitBounds).
 * Devuelve una FeatureCollection con 0 o 1 feature, con la geometría ya en 4326.
 */
export async function getPredioGeoJSONById(id: number): Promise<FeatureCollection> {
  const rows = await sql<{ id: number; nombre: string; area_ha: number; geom: string }[]>`
    SELECT p.id_predio AS id, p.nombre_predio AS nombre, p.area_ha,
           ST_AsGeoJSON(
             CASE WHEN ST_SRID(p.geom) = 4326 THEN p.geom
                  ELSE ST_Transform(p.geom, 4326) END
           ) AS geom
    FROM sgs_pre_predio p
    WHERE p.id_predio = ${id} AND p.geom IS NOT NULL
    LIMIT 1;
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
}

/** Biomas — polígonos de cobertura vegetal IAVH. */
export const getBiomasGeoJSON = unstable_cache(
  async (): Promise<FeatureCollection> => {
    // La tabla `sgs_amb_bioma` puede no tener columna `geom` (import parcial).
    // En ese caso devolvemos una colección vacía en vez de romper con 503.
    let rows: { id: number; nombre: string; area_ha: number; geom: string }[] = [];
    try {
      rows = await sql<{ id: number; nombre: string; area_ha: number; geom: string }[]>`
        SELECT id_bioma AS id, bioma_iavh AS nombre, area_ha,
               ST_AsGeoJSON(geom) AS geom
        FROM sgs_amb_bioma
        WHERE geom IS NOT NULL
        ORDER BY bioma_iavh;
      `;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[geo] biomas sin geometría:", (err as Error).message);
      }
      rows = [];
    }
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

/** Drenajes simples — líneas (quebradas).
 *
 * UX-04 (audit 2026-07-24): NO wrappear en `unstable_cache`. El dataset tiene
 * 2985 features ≈ 11 MB serializado. `unstable_cache` de Next.js tiene un
 * limite estricto de 2 MB por item (`Error: items over 2MB can not be cached`).
 * Como resultado el cache falla silenciosamente, satura el log de Next.js en
 * cada request, y la respuesta igual se sirve — pero sin cache real.
 *
 * La cache se hace por HTTP (`Cache-Control: public, max-age=300` en el
 * route handler) que NO tiene ese limite. Si el dia de mañana el layer crece
 * a >100MB y queremos cache real, la opcion es vector tiles (MVT) o
 * simplificar la geometria en BD (`ST_Simplify(geom, 0.0001)`).
 */
export async function getDrenajesSimplesGeoJSON(
  componente: string | null = null,
  accion: string | null = null,
): Promise<FeatureCollection> {
  const rows = await sql<{ id: number; nombre: string; estado: string; geom: string }[]>`
    SELECT id_drenaje_simple AS id, nombre_geografico AS nombre, estado_drenaje AS estado,
           ST_AsGeoJSON(geom) AS geom
    FROM sgs_inf_drenaje_simple
    WHERE geom IS NOT NULL ${filtroMunicipioAccion(componente, accion)}
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
}

/** Drenaje doble — líneas. */
export async function getDrenajesDoblesGeoJSON(
  componente: string | null = null,
  accion: string | null = null,
): Promise<FeatureCollection> {
  const rows = await sql<{ id: number; nombre: string; tipo: string; geom: string }[]>`
    SELECT id_drenaje_doble AS id, nombre_geografico AS nombre, tipo,
           ST_AsGeoJSON(geom) AS geom
    FROM sgs_inf_drenaje_doble
    WHERE geom IS NOT NULL ${filtroMunicipioAccion(componente, accion)}
    ORDER BY id_drenaje_doble;
  `;
  return {
    type: "FeatureCollection",
    features: rows.map((r) => ({
      type: "Feature",
      id: r.id,
      properties: { id: r.id, nombre: r.nombre, tipo: r.tipo, layer: "drenajes_dobles" },
      geometry: JSON.parse(r.geom) as GeoJSON.Geometry,
    })),
  };
}

/** Páramos / áreas protegidas — polígonos (sgs_amb_paramos.geom, SRID 4686). */
export const getParamosGeoJSON = unstable_cache(
  async (): Promise<FeatureCollection> => {
    try {
      const rows = await sql<{
        id: number;
        nombre: string | null;
        complejo: string | null;
        area_ha: number | string | null;
        geom: string;
      }[]>`
        SELECT id_paramos AS id, nombre_paramo AS nombre, complejo_nombre AS complejo, area_ha,
               ST_AsGeoJSON(
                 CASE WHEN ST_SRID(geom) = 4326 THEN geom
                      ELSE ST_Transform(geom, 4326) END
               ) AS geom
        FROM sgs_amb_paramos
        WHERE geom IS NOT NULL
        ORDER BY nombre_paramo;
      `;
      return {
        type: "FeatureCollection",
        features: rows.map((r) => ({
          type: "Feature",
          id: r.id,
          properties: {
            id: r.id,
            nombre: r.nombre,
            complejo: r.complejo,
            areaHa: r.area_ha != null ? Number(r.area_ha) : null,
            layer: "paramos",
          },
          geometry: JSON.parse(r.geom) as GeoJSON.Geometry,
        })),
      };
    } catch (err) {
      // Defensivo: si faltara `geom`, no romper con 503.
      if (process.env.NODE_ENV !== "production") {
        console.warn("[geo] paramos:", (err as Error).message);
      }
      return { type: "FeatureCollection", features: [] };
    }
  },
  ["geo-paramos"],
  { revalidate: 300, tags: ["mapa"] },
);

/** Vías — líneas. */
export const getViasGeoJSON = unstable_cache(
  async (componente: string | null = null, accion: string | null = null): Promise<FeatureCollection> => {
    const rows = await sql<{ id: number; tipo: string; estado: string; geom: string }[]>`
      SELECT id_via AS id, tipo_via AS tipo, estado_superficie AS estado,
             ST_AsGeoJSON(geom) AS geom
      FROM sgs_inf_via
      WHERE geom IS NOT NULL ${filtroMunicipioAccion(componente, accion)}
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

/** Filtro reutilizable de propuestas por (componente, accion) sobre alias pp/a/c. */
function filtroProps(componente: string | null, accion: string | null) {
  let comp: string | null = componente;
  let nombres: string[] | null = null;
  const code = accion ? normalizarAccion(accion) : null;
  if (code) {
    const def = accionDef(code);
    if (!comp) comp = def.componente;
    nombres = def.nombres;
  }
  const compCond = comp ? sql`AND c.nombre = ${comp}` : sql``;
  const accionCond = !nombres
    ? sql``
    : nombres.length === 1
    ? sql`AND a.nombre = ${nombres[0]}`
    : sql`AND a.nombre IN ${sql(nombres)}`;
  return { compCond, accionCond };
}

/** Propuestas línea — polilíneas de propuestas de aislamiento. */
export const getPropuestasLineaGeoJSON = unstable_cache(
  async (componente: string | null = null, accion: string | null = null): Promise<FeatureCollection> => {
    const { compCond, accionCond } = filtroProps(componente, accion);
    const rows = await sql<{ id: number; actividad: string; longitud_km: number; geom: string }[]>`
      SELECT pl.id_propuesta AS id, pl.actividad, pl.longitud_km,
             ST_AsGeoJSON(CASE WHEN ST_SRID(pl.geom) = 4326 THEN pl.geom ELSE ST_Transform(pl.geom, 4326) END) AS geom
      FROM sgs_pro_propuesta_linea pl
      JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pl.id_propuesta
      JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
      JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
      WHERE pl.geom IS NOT NULL ${compCond} ${accionCond}
      ORDER BY pl.id_propuesta;
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

/** Propuestas punto — puntos de intervención (cosecha, compostaje, estaciones, obras). */
export const getPropuestasPuntoGeoJSON = unstable_cache(
  async (componente: string | null = null, accion: string | null = null): Promise<FeatureCollection> => {
    const { compCond, accionCond } = filtroProps(componente, accion);
    const rows = await sql<{
      id: number;
      nombre: string | null;
      tipo: string | null;
      beneficiario: string | null;
      cedula: string | null;
      telefono: string | null;
      predio_nombre: string | null;
      municipio: string | null;
      geom: string;
    }[]>`
      SELECT pt.id_prop_punto AS id, pt.actividad AS nombre, pt.tipo_punto AS tipo,
             pt.beneficiario, pt.cedula, pt.telefono, pt.predio_nombre,
             mun.nombre_municipio AS municipio,
             ST_AsGeoJSON(CASE WHEN ST_SRID(pt.geom) = 4326 THEN pt.geom ELSE ST_Transform(pt.geom, 4326) END) AS geom
      FROM sgs_pro_propuesta_punto pt
      JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pt.id_propuesta
      JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
      JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
      LEFT JOIN LATERAL (
        SELECT m.nombre_municipio
        FROM bcs_lpa_municipio m
        WHERE ST_Intersects(m.geom, pt.geom)
        LIMIT 1
      ) mun ON true
      WHERE pt.geom IS NOT NULL ${compCond} ${accionCond}
      ORDER BY pt.id_prop_punto;
    `;
    return {
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        id: r.id,
        properties: {
          id: r.id,
          nombre: r.nombre,
          tipo: r.tipo,
          beneficiario: r.beneficiario,
          cedula: r.cedula,
          telefono: r.telefono,
          predioNombre: r.predio_nombre,
          municipio: r.municipio,
          layer: "propuestas_punto",
        },
        geometry: JSON.parse(r.geom) as GeoJSON.Geometry,
      })),
    };
  },
  ["geo-propuestas-punto"],
  { revalidate: 300, tags: ["mapa"] },
);

/** Propuestas polígono — áreas de intervención. */
export const getPropuestasPoligonoGeoJSON = unstable_cache(
  async (componente: string | null = null, accion: string | null = null): Promise<FeatureCollection> => {
    const { compCond, accionCond } = filtroProps(componente, accion);
    const rows = await sql<{ id: number; nombre: string | null; area_ha: number; geom: string }[]>`
      SELECT pq.id_propuesta AS id, pq.actividad AS nombre, pq.area_ha,
             ST_AsGeoJSON(CASE WHEN ST_SRID(pq.geom) = 4326 THEN pq.geom ELSE ST_Transform(pq.geom, 4326) END) AS geom
      FROM sgs_pro_propuesta_poligono pq
      JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pq.id_propuesta
      JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
      JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
      WHERE pq.geom IS NOT NULL ${compCond} ${accionCond}
      ORDER BY pq.id_propuesta;
    `;
    return {
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        id: r.id,
        properties: { id: r.id, nombre: r.nombre, areaHa: Number(r.area_ha), layer: "propuestas_poligono" },
        geometry: JSON.parse(r.geom) as GeoJSON.Geometry,
      })),
    };
  },
  ["geo-propuestas-poligono"],
  { revalidate: 300, tags: ["mapa"] },
);

// =============================================================================
// Huella de un componente (DEEPSEEK-76) — punto + polígono + línea de TODAS las
// propuestas del componente. Se usa para el "zoom a componente" del mapa: el
// visor hace fitBounds sobre esta capa y la resalta encima de las capas base.
// T1 filtro-accion: acepta también `accion` (código CxAy) para filtrar la huella
// a una acción concreta (C3AU mapea a IN ('U','A1')).
// No se cachea: es una consulta acotada (subconjunto) y cambia con cada filtro.
// =============================================================================
export async function getComponenteFootprintGeoJSON(
  componente: string | null,
  accion: AccionCode | null = null,
): Promise<FeatureCollection> {
  const code = accion ? normalizarAccion(accion) : null;
  const def = code ? accionDef(code) : null;
  const comp = def ? def.componente : /^C[123]$/.test(componente ?? "") ? componente : null;
  if (!comp) return { type: "FeatureCollection", features: [] };
  const accionSql = def ? sql`AND a.nombre IN ${sql(def.acciones)}` : sql``;

  const rows = await sql<{ tipo: string; id: number; nombre: string | null; geom: string }[]>`
    WITH comp AS (
      SELECT a.id_accion
      FROM sgs_com_accion a
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE c.nombre = ${comp} ${accionSql}
    )
    SELECT 'punto' AS tipo, pt.id_prop_punto AS id, pt.actividad AS nombre,
           ST_AsGeoJSON(CASE WHEN ST_SRID(pt.geom) = 4326 THEN pt.geom ELSE ST_Transform(pt.geom, 4326) END) AS geom
    FROM sgs_pro_propuesta_punto pt
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
    WHERE pt.geom IS NOT NULL AND pp.id_accion IN (SELECT id_accion FROM comp)
    UNION ALL
    SELECT 'poligono', pq.id_prop_poligono, pq.actividad,
           ST_AsGeoJSON(CASE WHEN ST_SRID(pq.geom) = 4326 THEN pq.geom ELSE ST_Transform(pq.geom, 4326) END)
    FROM sgs_pro_propuesta_poligono pq
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
    WHERE pq.geom IS NOT NULL AND pp.id_accion IN (SELECT id_accion FROM comp)
    UNION ALL
    SELECT 'linea', pl.id_prop_linea, pl.actividad,
           ST_AsGeoJSON(CASE WHEN ST_SRID(pl.geom) = 4326 THEN pl.geom ELSE ST_Transform(pl.geom, 4326) END)
    FROM sgs_pro_propuesta_linea pl
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
    WHERE pl.geom IS NOT NULL AND pp.id_accion IN (SELECT id_accion FROM comp);
  `;

  return {
    type: "FeatureCollection",
    features: rows.map((r) => ({
      type: "Feature",
      id: r.id,
      properties: { id: r.id, nombre: r.nombre, tipo: r.tipo, layer: "componente" },
      geometry: JSON.parse(r.geom) as GeoJSON.Geometry,
    })),
  };
}
