import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

for (const t of ["sgs_inf_drenaje_doble", "bcs_dh_quebrada"]) {
  console.log(`\n${t}:`);
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = ${t}
    ORDER BY ordinal_position
  `;
  for (const c of cols) console.log(`  ${c.column_name} ${c.data_type} ${c.is_nullable}`);
  const cnt = await sql`SELECT count(*)::int AS n FROM ${sql(t)}`;
  console.log(`  Current rows: ${cnt[0].n}`);
}
await sql.end();
