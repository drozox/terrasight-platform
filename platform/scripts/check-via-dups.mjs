import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, {max:1, onnotice:()=>{}});
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='sgs_inf_via' ORDER BY ordinal_position`;
console.log("sgs_inf_via columns:", cols.map(r => r.column_name).join(", "));
const r = await sql`SELECT count(*)::int AS total FROM sgs_inf_via`;
console.log("total rows:", r[0].total);
const r2 = await sql`SELECT id_via, tipo_via, id_municipio, ST_AsText(ST_StartPoint(geom)) as pt FROM sgs_inf_via ORDER BY id_via LIMIT 3`;
for (const r of r2) console.log(r);
await sql.end({timeout:1});
