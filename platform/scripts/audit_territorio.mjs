import postgres from "postgres";
const url = "postgresql://postgres:Nikoleta%2F20000@db.pjcvewberfgwywfnutjv.supabase.co:6543/postgres?sslmode=require";
const sql = postgres(url, { max: 1, prepare: false });

(async () => {
  // 1. Distribución de propuestas: por tipo y por presencia de id_predio
  console.log("=== distribución de propuestas por tipo y presencia de id_predio ===");
  const dist = await sql`
    SELECT
      count(*)::int AS total_propuestas,
      count(id_predio)::int AS con_predio,
      count(*)::int - count(id_predio)::int AS sin_predio
    FROM sgs_pro_propuesta
  `;
  console.log("  prop_super:", dist[0]);

  const distHija = await sql`
    SELECT 'punto' AS tipo, count(*)::int AS total FROM sgs_pro_propuesta_punto
    UNION ALL SELECT 'linea', count(*)::int FROM sgs_pro_propuesta_linea
    UNION ALL SELECT 'poligono', count(*)::int FROM sgs_pro_propuesta_poligono
  `;
  console.log("  hijas:", distHija);

  // 2. Propuestas con geom vs sin geom
  console.log("\n=== propuestas con geom ===");
  const geomStats = await sql`
    SELECT 'punto' AS tipo,
      count(*)::int AS total,
      count(geom)::int AS con_geom,
      count(*)::int - count(geom)::int AS sin_geom
    FROM sgs_pro_propuesta_punto
    UNION ALL SELECT 'linea', count(*)::int, count(geom)::int, count(*)::int - count(geom)::int FROM sgs_pro_propuesta_linea
    UNION ALL SELECT 'poligono', count(*)::int, count(geom)::int, count(*)::int - count(geom)::int FROM sgs_pro_propuesta_poligono
  `;
  for (const r of geomStats) console.log(`  ${r.tipo}: ${r.con_geom}/${r.total} con geom`);

  // 3. Test intersección espacial propuesta_punto (sin id_predio) con municipio
  console.log("\n=== test intersección espacial (muestra, primer 10) ===");
  const inter = await sql`
    SELECT m.nombre_municipio, pt.actividad, count(*)::int AS n
    FROM sgs_pro_propuesta_punto pt
    JOIN bcs_lpa_municipio m ON ST_Intersects(m.geom, pt.geom)
    WHERE pt.id_predio IS NULL
    GROUP BY m.nombre_municipio, pt.actividad
    ORDER BY n DESC
    LIMIT 10
  `;
  for (const r of inter) console.log(`  ${r.nombre_municipio} [${r.n}] ${r.actividad}`);

  // 4. Total de municipios intervenidos con intersección espacial (todas las propuestas)
  console.log("\n=== municipios intervenidos (con intersección espacial, todas las propuestas) ===");
  const munAll = await sql`
    WITH propuestas_geom AS (
      SELECT geom FROM sgs_pro_propuesta_punto WHERE geom IS NOT NULL
      UNION ALL SELECT geom FROM sgs_pro_propuesta_linea WHERE geom IS NOT NULL
      UNION ALL SELECT geom FROM sgs_pro_propuesta_poligono WHERE geom IS NOT NULL
    )
    SELECT count(DISTINCT m.id_municipio)::int AS n_municipios
    FROM bcs_lpa_municipio m
    WHERE EXISTS (SELECT 1 FROM propuestas_geom p WHERE ST_Intersects(m.geom, p.geom))
  `;
  console.log("  municipios con intersección:", munAll[0]);

  // 5. Total de propuestas
  console.log("\n=== verificar: hay prop_super con id_predio pero sin hijas? ===");
  const orphan = await sql`
    SELECT count(*)::int AS n_super
    FROM sgs_pro_propuesta pp
    WHERE NOT EXISTS (SELECT 1 FROM sgs_pro_propuesta_punto pt WHERE pt.id_propuesta = pp.id_propuesta)
      AND NOT EXISTS (SELECT 1 FROM sgs_pro_propuesta_linea pl WHERE pl.id_propuesta = pp.id_propuesta)
      AND NOT EXISTS (SELECT 1 FROM sgs_pro_propuesta_poligono pq WHERE pq.id_propuesta = pp.id_propuesta)
  `;
  console.log("  super sin hijas:", orphan[0]);

  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
