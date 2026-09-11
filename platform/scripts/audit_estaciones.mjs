import postgres from "postgres";
const url = "process.env.DATABASE_URL ?? "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf"";
const sql = postgres(url, { max: 1, prepare: false });

(async () => {
  console.log("=== C2A2 fuzzy: ¿qué actividades contienen 'estacion'/'limnimet' pero no matchean el patrón actual? ===");
  const candidates = await sql`
    SELECT c.nombre AS comp, a.nombre AS acc, unaccent(pt.actividad) AS actividad, count(*)::int AS n
    FROM sgs_pro_propuesta_punto pt
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C2' AND a.nombre = 'A2'
      AND (unaccent(pt.actividad) ILIKE unaccent('%estacion%')
           OR unaccent(pt.actividad) ILIKE unaccent('%limnimet%')
           OR unaccent(pt.actividad) ILIKE unaccent('%meteo%')
           OR unaccent(pt.actividad) ILIKE unaccent('%pluvio%')
           OR unaccent(pt.actividad) ILIKE unaccent('%hidro%'))
    GROUP BY c.nombre, a.nombre, unaccent(pt.actividad)
    ORDER BY n DESC
  `;
  for (const r of candidates) console.log(`  C${r.comp}A${r.acc} [${r.n}] ${r.actividad}`);

  console.log("\n=== TODAS las actividades en C2A2 ===");
  const all = await sql`
    SELECT unaccent(pt.actividad) AS actividad, count(*)::int AS n
    FROM sgs_pro_propuesta_punto pt
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C2' AND a.nombre = 'A2'
    GROUP BY unaccent(pt.actividad)
    ORDER BY n DESC
  `;
  for (const r of all) console.log(`  [${r.n}] ${r.actividad}`);

  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
