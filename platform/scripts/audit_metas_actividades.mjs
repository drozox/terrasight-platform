import postgres from "postgres";
const url = "process.env.DATABASE_URL ?? "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf"";
const sql = postgres(url, { max: 1, prepare: false });

(async () => {
  console.log("=== propuesta_poligono C1A2 (actividades únicas) ===");
  const polAct = await sql`
    SELECT unaccent(pq.actividad) AS actividad, count(*)::int AS n,
           round(sum(pq.area_ha)::numeric, 3) AS ha
    FROM sgs_pro_propuesta_poligono pq
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C1' AND a.nombre = 'A2'
    GROUP BY unaccent(pq.actividad)
    ORDER BY n DESC
  `;
  for (const r of polAct) console.log(`  [${r.n}] ${r.actividad} (${r.ha} ha)`);

  console.log("\n=== propuesta_linea C1A1 (actividades únicas) ===");
  const linAct = await sql`
    SELECT unaccent(pl.actividad) AS actividad, count(*)::int AS n,
           round(sum(pl.longitud_km)::numeric, 3) AS km
    FROM sgs_pro_propuesta_linea pl
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C1' AND a.nombre = 'A1'
    GROUP BY unaccent(pl.actividad)
    ORDER BY n DESC
  `;
  for (const r of linAct) console.log(`  [${r.n}] ${r.actividad} (${r.km} km)`);

  console.log("\n=== propuesta_punto (actividades únicas, por C-A) ===");
  const ptAct = await sql`
    SELECT c.nombre AS comp, a.nombre AS acc, unaccent(pt.actividad) AS actividad, count(*)::int AS n
    FROM sgs_pro_propuesta_punto pt
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    GROUP BY c.nombre, a.nombre, unaccent(pt.actividad)
    ORDER BY comp, acc, n DESC
  `;
  for (const r of ptAct) console.log(`  C${r.comp}A${r.acc} [${r.n}] ${r.actividad}`);

  console.log("\n=== propuesta_linea C1A2 (también filtra por líneas?) ===");
  const linActA2 = await sql`
    SELECT unaccent(pl.actividad) AS actividad, count(*)::int AS n,
           round(sum(pl.longitud_km)::numeric, 3) AS km
    FROM sgs_pro_propuesta_linea pl
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C1' AND a.nombre = 'A2'
    GROUP BY unaccent(pl.actividad)
    ORDER BY n DESC
  `;
  for (const r of linActA2) console.log(`  [${r.n}] ${r.actividad} (${r.km} km)`);

  await sql.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
