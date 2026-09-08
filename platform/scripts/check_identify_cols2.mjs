import postgres from "postgres";
const url = "postgresql://postgres:Nikoleta%2F20000@db.pjcvewberfgwywfnutjv.supabase.co:6543/postgres?sslmode=require";
const sql = postgres(url, { max: 1, prepare: false });

const restantes = ["bcs_lpa_municipio", "bcs_lpa_vereda", "bcs_dh_microcuenca", "sgs_com_accion", "sgs_com_componente"];
for (const tabla of restantes) {
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tabla}
    ORDER BY ordinal_position
  `;
  console.log(`\n${tabla}:`);
  for (const c of cols) console.log(`  ${c.column_name}`);
}

await sql.end();
