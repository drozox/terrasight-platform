import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

for (const t of ["sgs_pro_propuesta_punto", "sgs_pro_propuesta_linea", "sgs_pro_propuesta_poligono"]) {
  console.log(`\n${t}:`);
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns WHERE table_name = ${t}
    ORDER BY ordinal_position
  `;
  for (const c of cols) console.log(`  ${c.column_name} ${c.data_type} ${c.is_nullable}`);
  const geom = await sql`
    SELECT type, srid FROM geometry_columns WHERE f_table_name = ${t}
  `;
  if (geom.length) console.log(`  geom: ${geom[0].type} SRID=${geom[0].srid}`);
}
await sql.end();
