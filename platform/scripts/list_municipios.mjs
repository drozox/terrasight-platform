import postgres from "postgres";
const url = "postgresql://postgres:Nikoleta%2F20000@db.pjcvewberfgwywfnutjv.supabase.co:6543/postgres?sslmode=require";
const sql = postgres(url, { max: 1, prepare: false });
(async () => {
  const r = await sql`SELECT id_municipio, nombre_municipio FROM bcs_lpa_municipio ORDER BY id_municipio`;
  for (const row of r) console.log(`  ${row.id_municipio}: ${row.nombre_municipio}`);
  await sql.end();
})();
