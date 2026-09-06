import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

console.log("bcs_dh_quebrada constraints:");
const cons = await sql`
  SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) AS def
  FROM pg_constraint con
  JOIN pg_class cl ON cl.oid = con.conrelid
  WHERE cl.relname = 'bcs_dh_quebrada'
  ORDER BY con.contype, con.conname
`;
for (const c of cons) console.log(`  ${c.conname} (${c.contype}): ${c.def}`);

console.log("\nsgs_inf_drenaje_doble constraints:");
const cons2 = await sql`
  SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) AS def
  FROM pg_constraint con
  JOIN pg_class cl ON cl.oid = con.conrelid
  WHERE cl.relname = 'sgs_inf_drenaje_doble'
  ORDER BY con.contype, con.conname
`;
for (const c of cons2) console.log(`  ${c.conname} (${c.contype}): ${c.def}`);

await sql.end();
