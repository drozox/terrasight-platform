import postgres from "postgres";
const url = process.env.DATABASE_URL ?? "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf";
const sql = postgres(url, { max: 1, prepare: false });

(async () => {
  console.log("=== agroforestal: Â¿cuÃ¡l matchea? ===");
  const r = await sql`
    SELECT unaccent(pq.actividad) AS actividad, round(sum(pq.area_ha)::numeric, 2) AS ha
    FROM sgs_pro_propuesta_poligono pq
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C1' AND a.nombre = 'A2'
      AND (unaccent(pq.actividad) ILIKE unaccent('%agroforestal%')
        OR unaccent(pq.actividad) ILIKE unaccent('%bosque%comestible%')
        OR unaccent(pq.actividad) ILIKE unaccent('%modulo%')
        OR unaccent(pq.actividad) ILIKE unaccent('%banco%'))
    GROUP BY unaccent(pq.actividad)
    ORDER BY ha DESC
  `;
  for (const row of r) console.log(`  ${row.actividad}: ${row.ha} ha`);

  // Test especÃ­fico: "Bosques Comestibles" matchea "%bosque%comestible%"?
  console.log("\n=== test match exacto: '%bosque%comestible%' ===");
  const test1 = await sql`
    SELECT unaccent(pq.actividad) AS actividad, count(*)::int AS n
    FROM sgs_pro_propuesta_poligono pq
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C1' AND a.nombre = 'A2'
      AND unaccent(pq.actividad) ILIKE unaccent('%bosque%comestible%')
    GROUP BY unaccent(pq.actividad)
  `;
  console.log("  ", test1);

  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
