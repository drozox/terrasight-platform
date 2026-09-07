// audit_long_area.mjs — Por qué longitud_km y area_ha están en 0
import postgres from "postgres";
const url = process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }
const sql = postgres(url, { max: 2, onnotice: () => {} });

console.log("=== Schema de las hijas ===");
for (const t of ["sgs_pro_propuesta_linea", "sgs_pro_propuesta_poligono"]) {
  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = ${t}
      AND (column_name LIKE '%longit%' OR column_name LIKE '%area%' OR column_name LIKE '%m%' OR column_name LIKE '%ha%')
    ORDER BY column_name
  `;
  console.log(`\n${t}:`);
  for (const c of cols) console.log(`  ${c.column_name} ${c.data_type}`);
}

console.log("\n=== Muestra de Propuestas_línea (10 rows) ===");
const l = await sql`
  SELECT id_prop_linea, actividad, longitud_m, longitud_km
  FROM sgs_pro_propuesta_linea
  WHERE actividad IN ('Cerco vivo', 'Aislamiento con cerco de alambre')
  LIMIT 10
`;
for (const r of l) console.log(" ", r);

console.log("\n=== Muestra de Propuestas_polígono (10 rows) ===");
const p = await sql`
  SELECT id_prop_poligono, actividad, area_ha, area_m2
  FROM sgs_pro_propuesta_poligono
  LIMIT 10
`;
for (const r of p) console.log(" ", r);

console.log("\n=== Counts NULL vs 0 vs >0 ===");
const cnts = await sql`
  SELECT
    (SELECT count(*)::int FROM sgs_pro_propuesta_linea) AS total_linea,
    (SELECT count(*)::int FROM sgs_pro_propuesta_linea WHERE longitud_km > 0) AS linea_km_pos,
    (SELECT count(*)::int FROM sgs_pro_propuesta_linea WHERE longitud_km IS NULL) AS linea_km_null,
    (SELECT count(*)::int FROM sgs_pro_propuesta_linea WHERE longitud_m > 0) AS linea_m_pos,
    (SELECT count(*)::int FROM sgs_pro_propuesta_linea WHERE longitud_m IS NULL) AS linea_m_null,
    (SELECT count(*)::int FROM sgs_pro_propuesta_poligono) AS total_polig,
    (SELECT count(*)::int FROM sgs_pro_propuesta_poligono WHERE area_ha > 0) AS polig_ha_pos,
    (SELECT count(*)::int FROM sgs_pro_propuesta_poligono WHERE area_ha IS NULL) AS polig_ha_null
`;
console.log(" ", cnts[0]);

console.log("\n=== ¿Cuántas propuestas_línea tienen geom? ===");
const g = await sql`SELECT count(*)::int AS n FROM sgs_pro_propuesta_linea WHERE geom IS NOT NULL`;
console.log(" ", g[0]);

await sql.end();
