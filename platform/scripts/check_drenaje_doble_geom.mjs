import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

const c = await sql`
  SELECT column_name, data_type, udt_name
  FROM information_schema.columns
  WHERE table_name = 'sgs_inf_drenaje_doble' AND (data_type = 'USER-DEFINED' OR column_name = 'geom')
`;
for (const r of c) console.log("drenaje_doble geom:", r);

const c2 = await sql`
  SELECT column_name, data_type, udt_name
  FROM information_schema.columns
  WHERE table_name = 'bcs_dh_quebrada' AND (data_type = 'USER-DEFINED' OR column_name = 'geom' OR column_name LIKE 'longit%')
`;
for (const r of c2) console.log("quebrada geom/longit:", r);

await sql.end();
