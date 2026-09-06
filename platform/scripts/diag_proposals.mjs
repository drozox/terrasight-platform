import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

console.log("Estado de propuesta tables:");
const r = await sql`
  SELECT
    (SELECT count(*)::int FROM sgs_pro_propuesta) AS super,
    (SELECT count(*)::int FROM sgs_pro_propuesta_punto) AS punto,
    (SELECT count(*)::int FROM sgs_pro_propuesta_linea) AS linea,
    (SELECT count(*)::int FROM sgs_pro_propuesta_poligono) AS poligono
`;
console.log(" ", r[0]);

console.log("\nFK constraints de propuesta_punto:");
const fk = await sql`
  SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) AS def
  FROM pg_constraint con
  JOIN pg_class cl ON cl.oid = con.conrelid
  WHERE cl.relname IN ('sgs_pro_propuesta_punto','sgs_pro_propuesta_linea','sgs_pro_propuesta_poligono')
    AND con.contype = 'f'
`;
for (const c of fk) console.log(" ", c.conname, ":", c.def);

console.log("\nTriggers de la DB:");
const trg = await sql`
  SELECT tgname, tgrelid::regclass, tgenabled FROM pg_trigger
  WHERE NOT tgisinternal ORDER BY tgrelid::regclass::text
`;
for (const t of trg) console.log(" ", t);

await sql.end();
