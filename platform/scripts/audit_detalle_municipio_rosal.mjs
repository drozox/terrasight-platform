import postgres from "postgres";
const url = process.env.DATABASE_URL ?? "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf";
const sql = postgres(url, { max: 2, prepare: false });

const idMunicipio = 17; // GUATAVITA - top municipio
console.log(`=== Detalle municipio id=${idMunicipio} ===\n`);

// 1. Metadatos
const muni = await sql`
  SELECT id_municipio, nombre_municipio FROM bcs_lpa_municipio WHERE id_municipio = ${idMunicipio}
`;
console.log("Municipio:", muni[0]);

// 2. Propuestas que tocan el municipio
const props = await sql`
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
  SELECT id_propuesta FROM propuestas_municipio
`;
const propIds = props.map((r) => Number(r.id_propuesta));
console.log(`Propuestas que tocan el municipio: ${propIds.length}`);

if (propIds.length === 0) { await sql.end(); process.exit(0); }

// 3. Indicadores (mismo query que getDetalleMunicipio)
const inds = await sql`
  WITH prop_muni AS (
    SELECT id_propuesta FROM unnest(${sql.array(propIds, 23)}) AS id_propuesta
  )
  SELECT
    (SELECT round(COALESCE(SUM(pl.longitud_km), 0)::numeric, 3) FROM sgs_pro_propuesta_linea pl
     JOIN prop_muni ON prop_muni.id_propuesta = pl.id_propuesta
     WHERE unaccent(pl.actividad) ILIKE unaccent('%cerco vivo%')
        OR unaccent(pl.actividad) ILIKE unaccent('%cerca viva%')
    ) AS km_cercos_vivos,
    (SELECT round(COALESCE(SUM(pl.longitud_km), 0)::numeric, 3) FROM sgs_pro_propuesta_linea pl
     JOIN prop_muni ON prop_muni.id_propuesta = pl.id_propuesta
     WHERE unaccent(pl.actividad) ILIKE unaccent('%alambre%')
    ) AS km_alambre,
    (SELECT round(COALESCE(SUM(pl.longitud_km), 0)::numeric, 3) FROM sgs_pro_propuesta_linea pl
     JOIN prop_muni ON prop_muni.id_propuesta = pl.id_propuesta
     WHERE unaccent(pl.actividad) ILIKE unaccent('%franja%conectividad%')
        OR unaccent(pl.actividad) ILIKE unaccent('%conectividad%')
    ) AS km_conectividad,
    (SELECT round(COALESCE(SUM(pq.area_ha), 0)::numeric, 2) FROM sgs_pro_propuesta_poligono pq
     JOIN prop_muni ON prop_muni.id_propuesta = pq.id_propuesta
     WHERE unaccent(pq.actividad) ILIKE unaccent('%silvopastoril%')
        OR unaccent(pq.actividad) ILIKE unaccent('%silvopast%')
        OR unaccent(pq.actividad) ILIKE unaccent('%pastos arbolados%')
        OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%pastos%')
        OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%arbol%dispers%')
        OR unaccent(pq.actividad) ILIKE unaccent('%arboles dispersos%')
        OR unaccent(pq.actividad) ILIKE unaccent('%rastrojo%')
    ) AS ha_silvopastoril,
    (SELECT round(COALESCE(SUM(pq.area_ha), 0)::numeric, 2) FROM sgs_pro_propuesta_poligono pq
     JOIN prop_muni ON prop_muni.id_propuesta = pq.id_propuesta
     WHERE unaccent(pq.actividad) ILIKE unaccent('%agroforestal%')
        OR unaccent(pq.actividad) ILIKE unaccent('%bosque%comestible%')
        OR unaccent(pq.actividad) ILIKE unaccent('%modulo%')
        OR unaccent(pq.actividad) ILIKE unaccent('%banco%')
    ) AS ha_agroforestal,
    (SELECT COUNT(*)::int FROM sgs_pro_propuesta_punto pt
     JOIN prop_muni ON prop_muni.id_propuesta = pt.id_propuesta
     WHERE unaccent(pt.actividad) ILIKE unaccent('%cosecha%')
    ) AS n_cosecha,
    (SELECT COUNT(*)::int FROM sgs_pro_propuesta_punto pt
     JOIN prop_muni ON prop_muni.id_propuesta = pt.id_propuesta
     WHERE unaccent(pt.actividad) ILIKE unaccent('%compost%')
    ) AS n_compostaje,
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
    (SELECT COUNT(DISTINCT pp.id_predio)::int
     FROM sgs_pro_propuesta pp
     JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
     JOIN sgs_com_componente c ON c.id_componente = a.id_componente
     JOIN prop_muni ON prop_muni.id_propuesta = pp.id_propuesta
     WHERE c.nombre = 'C3' AND pp.id_predio IS NOT NULL
    ) AS n_predios_c3
`;
console.log("\nIndicadores:", inds[0]);

// 4. Veredas con propuestas
const vers = await sql`
  WITH prop_muni AS (
    SELECT id_propuesta FROM unnest(${sql.array(propIds, 23)}) AS id_propuesta
  )
  SELECT v.nombre_vereda, count(DISTINCT pp.id_propuesta)::int AS n
  FROM prop_muni pm
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pm.id_propuesta
  JOIN sgs_pre_predio p ON p.id_predio = pp.id_predio
  JOIN bcs_lpa_vereda v ON v.id_vereda = p.id_vereda
  WHERE v.id_municipio = ${idMunicipio}
  GROUP BY v.nombre_vereda ORDER BY n DESC LIMIT 10
`;
console.log("\nTop 10 veredas:", vers);

// 5. DistribuciÃ³n por C-A
const dist = await sql`
  WITH prop_muni AS (
    SELECT id_propuesta FROM unnest(${sql.array(propIds, 23)}) AS id_propuesta
  )
  SELECT c.nombre AS comp, a.nombre AS acc, count(DISTINCT pp.id_propuesta)::int AS n
  FROM prop_muni pm
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pm.id_propuesta
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  GROUP BY c.nombre, a.nombre ORDER BY c.nombre, a.nombre
`;
console.log("\nDistribuciÃ³n C-A:", dist);

await sql.end({ timeout: 5 });
