import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

const t = await sql`
  SELECT type, srid FROM geometry_columns
  WHERE f_table_name IN ('sgs_inf_drenaje_doble', 'bcs_dh_quebrada')
  ORDER BY f_table_name
`;
console.log("Geometry types:");
for (const r of t) console.log(" ", r);

await sql.end();
