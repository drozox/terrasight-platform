import postgres from "postgres";
const url = "process.env.DATABASE_URL ?? "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf"";
const sql = postgres(url, { max: 1, prepare: false });
(async () => {
  const r = await sql`SELECT id_municipio, nombre_municipio FROM bcs_lpa_municipio ORDER BY id_municipio`;
  for (const row of r) console.log(`  ${row.id_municipio}: ${row.nombre_municipio}`);
  await sql.end();
})();
