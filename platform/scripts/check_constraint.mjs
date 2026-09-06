import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

const c = await sql`
  SELECT con.conname, pg_get_constraintdef(con.oid) AS def
  FROM pg_constraint con
  JOIN pg_class cl ON cl.oid = con.conrelid
  WHERE cl.relname = 'sgs_amb_cobertura_clc' AND con.contype = 'c'
`;
for (const r of c) console.log(r.conname, ":", r.def);

const v = await sql`SELECT DISTINCT estado_naturalidad FROM sgs_amb_cobertura_clc`;
console.log("Existing values:", v);

await sql.end();
