import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

for (const t of ["sgs_rel_predio_cobertura", "sgs_rel_predio_bioma", "sgs_rel_predio_paramos", "sgs_rel_predio_zonificacion_pomca", "sgs_rel_predio_zonificacion_rfp"]) {
  console.log(`\n${t}:`);
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${t} ORDER BY ordinal_position`;
  console.log(`  Cols: ${cols.map(c => c.column_name).join(", ")}`);
  const cons = await sql`
    SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    WHERE cl.relname = ${t}
  `;
  for (const c of cons) console.log(`  ${c.conname} (${c.contype}): ${c.def}`);
}
await sql.end();
