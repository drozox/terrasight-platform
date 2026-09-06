import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

for (const t of ["sgs_amb_cobertura_clc", "sgs_amb_zonificacion_rfp", "sgs_amb_zonificacion_pomca", "sgs_amb_bioma", "sgs_amb_paramos"]) {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = ${t}
    ORDER BY ordinal_position
  `;
  console.log(`\n${t}:`);
  for (const c of cols) console.log(`  ${c.column_name} ${c.data_type} ${c.is_nullable}`);
}
await sql.end();
