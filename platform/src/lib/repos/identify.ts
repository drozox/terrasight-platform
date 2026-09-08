// =============================================================================
// identify — buscar features cercanas a un punto (lng, lat)
//
// Sprint 18.2 — herramienta "Identificar" del mapa. Encuentra qué hay en
// un punto dado, en orden de distancia, dentro de una tolerancia.
//
// Capas cubiertas (en orden de prioridad — más específicas primero):
//   - Predios           (sgs_pre_predio)
//   - Propuestas super  (sgs_pro_propuesta, via id_predio del punto)
//   - Propuestas punto  (sgs_pro_propuesta_punto)
//   - Quebradas         (bcs_dh_quebrada)
//   - Drenaje simple    (sgs_inf_drenaje_simple)
//   - Drenaje doble     (sgs_inf_drenaje_doble)
//   - Vías              (sgs_inf_via)
//   - Municipio         (bcs_lpa_municipio)
//   - Vereda            (bcs_lpa_vereda)
//   - Microcuenca       (bcs_dh_microcuenca)
//
// Para no devolver 100 features, la query usa ST_DWithin con tolerancia
// (default 50m) + DISTINCT ON (tipo, id) + ORDER BY distance.
// =============================================================================

import { sql, pgNum, pgInt, pgText } from "../db";

export interface IdentifiedFeature {
  /** Capa: 'predio' | 'quebrada' | 'municipio' | ... */
  tipo: string;
  /** ID numérico de la feature en su tabla */
  id: number;
  /** Nombre humano para mostrar en el panel */
  nombre: string;
  /** Distancia en metros desde el punto de click */
  distance_m: number;
  /** Propiedades extra relevantes para el popup */
  properties: Record<string, string | number | null>;
}

export const findFeaturesAtPoint = async (
  lng: number,
  lat: number,
  toleranceM: number = 50,
  maxResults: number = 10,
): Promise<IdentifiedFeature[]> => {
  const pointWkt = `POINT(${lng} ${lat})`;

  // Query con CTE: un solo round-trip a la BD, todos los layers en un UNION ALL.
  // Cada subquery devuelve (tipo, id, nombre, distance_m, properties JSONB).
  // IMPORTANTE: en UNION ALL Postgres usa los nombres del primer SELECT,
  // por lo que todas las subqueries deben aliasar a 'tipo', 'id', 'nombre'.
  const rows = await sql<
    {
      tipo: string;
      id: number | string;
      nombre: string | null;
      distance_m: number | string;
      properties: Record<string, string | number | null> | null;
    }[]
  >`
    WITH punto AS (
      SELECT ST_GeomFromText(${pointWkt}, 4686) AS geom
    ),
    candidatos AS (
      -- 1. Predios (polígono) — el más específico
      SELECT
        'predio'::text AS tipo,
        pr.id_predio AS id,
        pr.nombre_predio AS nombre,
        round(ST_Distance(p.geom::geography, pr.geom::geography)::numeric, 2) AS distance_m,
        jsonb_build_object(
          'area_ha', round((pr.area_ha)::numeric, 2),
          'municipio', m.nombre_municipio,
          'vereda', v.nombre_vereda
        ) AS properties
      FROM sgs_pre_predio pr
      LEFT JOIN bcs_lpa_vereda v ON v.id_vereda = pr.id_vereda
      LEFT JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio,
        punto p
      WHERE ST_DWithin(pr.geom::geography, p.geom::geography, ${toleranceM})

      UNION ALL

      -- 2. Propuestas (súper) — asociadas al id_predio del punto
      SELECT
        'propuesta'::text AS tipo,
        pp.id_propuesta AS id,
        pp.actividad AS nombre,
        round(ST_Distance(p.geom::geography, pr.geom::geography)::numeric, 2) AS distance_m,
        jsonb_build_object(
          'componente', c.nombre,
          'accion', a.nombre,
          'estado', pp.estado,
          'nom_predio', pr.nombre_predio
        ) AS properties
      FROM sgs_pro_propuesta pp
      JOIN sgs_pre_predio pr ON pr.id_predio = pp.id_predio
      JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente,
        punto p
      WHERE ST_DWithin(pr.geom::geography, p.geom::geography, ${toleranceM})

      UNION ALL

      -- 3. Propuestas hijas (puntos con geom)
      SELECT
        'propuesta_punto'::text AS tipo,
        pt.id_prop_punto AS id,
        pt.actividad AS nombre,
        round(ST_Distance(p.geom::geography, pt.geom::geography)::numeric, 2) AS distance_m,
        jsonb_build_object(
          'tipo_punto', pt.tipo_punto,
          'tipo_obra', pt.tipo_obra,
          'id_propuesta', pt.id_propuesta
        ) AS properties
      FROM sgs_pro_propuesta_punto pt, punto p
      WHERE ST_DWithin(pt.geom::geography, p.geom::geography, ${toleranceM})

      UNION ALL

      -- 4. Quebradas
      SELECT
        'quebrada'::text AS tipo,
        q.id_quebrada AS id,
        q.nombre_quebrada AS nombre,
        round(ST_Distance(p.geom::geography, q.geom::geography)::numeric, 2) AS distance_m,
        jsonb_build_object('id_municipio', q.id_municipio) AS properties
      FROM bcs_dh_quebrada q, punto p
      WHERE ST_DWithin(q.geom::geography, p.geom::geography, ${toleranceM})

      UNION ALL

      -- 5. Drenaje simple
      SELECT
        'drenaje_simple'::text AS tipo,
        ds.id_drenaje_simple AS id,
        ds.nombre_geografico AS nombre,
        round(ST_Distance(p.geom::geography, ds.geom::geography)::numeric, 2) AS distance_m,
        jsonb_build_object('estado', ds.estado_drenaje) AS properties
      FROM sgs_inf_drenaje_simple ds, punto p
      WHERE ST_DWithin(ds.geom::geography, p.geom::geography, ${toleranceM})

      UNION ALL

      -- 6. Vías
      SELECT
        'via'::text AS tipo,
        v.id_via AS id,
        ('Vía ' || v.tipo_via)::text AS nombre,
        round(ST_Distance(p.geom::geography, v.geom::geography)::numeric, 2) AS distance_m,
        jsonb_build_object('tipo_via', v.tipo_via, 'carriles', v.numero_carriles) AS properties
      FROM sgs_inf_via v, punto p
      WHERE ST_DWithin(v.geom::geography, p.geom::geography, ${toleranceM})

      UNION ALL

      -- 7. Municipio (polígono grande)
      SELECT
        'municipio'::text AS tipo,
        m.id_municipio AS id,
        m.nombre_municipio AS nombre,
        round(ST_Distance(p.geom::geography, m.geom::geography)::numeric, 2) AS distance_m,
        jsonb_build_object('departamento', m.departamento) AS properties
      FROM bcs_lpa_municipio m, punto p
      WHERE ST_DWithin(m.geom::geography, p.geom::geography, ${toleranceM})

      UNION ALL

      -- 8. Vereda
      SELECT
        'vereda'::text AS tipo,
        v.id_vereda AS id,
        v.nombre_vereda AS nombre,
        round(ST_Distance(p.geom::geography, v.geom::geography)::numeric, 2) AS distance_m,
        jsonb_build_object('municipio', m.nombre_municipio, 'poblacion', v.poblacion_estimada) AS properties
      FROM bcs_lpa_vereda v
      JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio,
        punto p
      WHERE ST_DWithin(v.geom::geography, p.geom::geography, ${toleranceM})

      UNION ALL

      -- 9. Microcuenca
      SELECT
        'microcuenca'::text AS tipo,
        mc.id_microcuenca AS id,
        mc.nombre_microcuenca AS nombre,
        round(ST_Distance(p.geom::geography, mc.geom::geography)::numeric, 2) AS distance_m,
        jsonb_build_object('area_ha', mc.area) AS properties
      FROM bcs_dh_microcuenca mc, punto p
      WHERE ST_DWithin(mc.geom::geography, p.geom::geography, ${toleranceM})
    )
    SELECT DISTINCT ON (tipo, id) tipo, id, nombre, distance_m, properties
    FROM candidatos
    ORDER BY tipo, id, distance_m
  `;
  // Post-procesar: ordenar por distance_m y limitar
  const all = rows.map((r) => ({
    tipo: pgText(r.tipo),
    id: pgInt(r.id),
    nombre: pgText(r.nombre) || "(sin nombre)",
    distance_m: pgNum(r.distance_m),
    properties: (r.properties as Record<string, string | number | null>) || {},
  }));
  return all
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, maxResults);
};
