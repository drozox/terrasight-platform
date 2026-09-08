// test_metas_repo.mjs — Verificar las queries del repo metas-convenio
// (incluye cambios: conectividad en km desde líneas, fuzzy enriquecido,
// municipios/veredas con intersección espacial)
import postgres from "postgres";
const url = process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }
const sql = postgres(url, { max: 2, onnotice: () => {} });

console.log("=== C1A1: 12 km cercos vivos + 12 km alambre ===");
let r = await sql`
  SELECT
    round(SUM(CASE WHEN unaccent(pl.actividad) ILIKE unaccent('%cerco vivo%')
                     OR unaccent(pl.actividad) ILIKE unaccent('%cerca viva%')
                    THEN pl.longitud_km ELSE 0 END)::numeric, 3) AS km_cercos_vivos,
    round(SUM(CASE WHEN unaccent(pl.actividad) ILIKE unaccent('%alambre%')
                    THEN pl.longitud_km ELSE 0 END)::numeric, 3) AS km_alambre
  FROM sgs_pro_propuesta_linea pl
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  WHERE c.nombre = 'C1' AND a.nombre = 'A1'
`;
console.log(" ", r[0], "  meta: 12 km c/u");

console.log("\n=== C1A2: conectividad (km líneas) + silvopastoril + agroforestal (ha polígonos) ===");
r = await sql`
  SELECT
    -- Conectividad: km desde líneas con "Franja de Conectividad"
    round((
      SELECT COALESCE(SUM(pl.longitud_km), 0)
      FROM sgs_pro_propuesta_linea pl
      JOIN sgs_pro_propuesta pp2 ON pp2.id_propuesta = pl.id_propuesta
      JOIN sgs_com_accion a2 ON a2.id_accion = pp2.id_accion
      JOIN sgs_com_componente c2 ON c2.id_componente = a2.id_componente
      WHERE c2.nombre = 'C1' AND a2.nombre = 'A2'
        AND (unaccent(pl.actividad) ILIKE unaccent('%franja%conectividad%')
             OR unaccent(pl.actividad) ILIKE unaccent('%conectividad%'))
    )::numeric, 3) AS km_conectividad,
    -- Silvopastoril: ha polígonos
    round(SUM(CASE WHEN unaccent(pq.actividad) ILIKE unaccent('%silvopastoril%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%silvopast%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%pastos arbolados%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%pastos%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%arbol%dispers%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%arboles dispersos%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%rastrojo%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%pradera%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%potrero%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%ssp%')
                    THEN pq.area_ha ELSE 0 END)::numeric, 2) AS ha_silvopastoril,
    -- Agroforestal: ha polígonos
    round(SUM(CASE WHEN unaccent(pq.actividad) ILIKE unaccent('%agroforestal%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%bosque%comestible%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%modulo%alta densidad%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%modulo%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%banco%proteina%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%banco%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%huerta%')
                     OR unaccent(pq.actividad) ILIKE unaccent('%callejon%')
                    THEN pq.area_ha ELSE 0 END)::numeric, 2) AS ha_agroforestal
  FROM sgs_pro_propuesta_poligono pq
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  WHERE c.nombre = 'C1' AND a.nombre = 'A2'
`;
console.log(" ", r[0], "  meta: 15 km conectividad, 15 ha c/u silvopastoril/agroforestal");

console.log("\n=== C2A1: 79 cosecha + 79 compostaje ===");
r = await sql`
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
console.log(" ", r[0], "  meta: 79 c/u");

console.log("\n=== C2A2: 7 estaciones + 48 obras ===");
r = await sql`
  SELECT
    SUM(CASE WHEN unaccent(pt.actividad) ILIKE unaccent('%estacion%limnimet%')
                OR unaccent(pt.actividad) ILIKE unaccent('%limnimet%')
              THEN 1 ELSE 0 END)::int AS n_estaciones,
    SUM(CASE WHEN unaccent(pt.actividad) ILIKE unaccent('%captacion%')
                OR unaccent(pt.actividad) ILIKE unaccent('%captaci%')
              THEN 1 ELSE 0 END)::int AS n_obras
  FROM sgs_pro_propuesta_punto pt
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
`;
console.log(" ", r[0], "  meta: 7 estaciones, 48 obras (sin filtro C-A, suma total)");

console.log("\n=== C3: 35 predios en áreas protegidas ===");
r = await sql`
  SELECT count(DISTINCT pp.id_predio)::int AS n
  FROM sgs_pro_propuesta pp
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  WHERE c.nombre = 'C3' AND pp.id_predio IS NOT NULL
`;
console.log(" ", r[0], "  meta: 35");

console.log("\n=== Adicional: municipios intervenidos (lookup + intersección espacial) ===");
r = await sql`
  WITH propuestas_geo AS (
    SELECT DISTINCT pp.id_propuesta, m.nombre_municipio
    FROM sgs_pro_propuesta pp
    JOIN sgs_pre_predio p ON p.id_predio = pp.id_predio
    JOIN bcs_lpa_vereda v ON v.id_vereda = p.id_vereda
    JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
    WHERE pp.id_predio IS NOT NULL
    UNION
    SELECT DISTINCT pp.id_propuesta, m.nombre_municipio
    FROM sgs_pro_propuesta_linea pl
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
    JOIN bcs_lpa_municipio m ON ST_Intersects(m.geom, pl.geom)
    UNION
    SELECT DISTINCT pp.id_propuesta, m.nombre_municipio
    FROM sgs_pro_propuesta_poligono pq
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
    JOIN bcs_lpa_municipio m ON ST_Intersects(m.geom, pq.geom)
  )
  SELECT nombre_municipio, count(DISTINCT id_propuesta)::int AS num
  FROM propuestas_geo
  GROUP BY nombre_municipio
  ORDER BY num DESC
`;
for (const row of r) console.log(`  ${row.nombre_municipio}: ${row.num}`);

await sql.end({ timeout: 5 });
