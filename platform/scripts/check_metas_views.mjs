import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

const v = await sql`SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname LIKE 'sgs_v_metas%'`;
console.log("Vistas metas:", v);

const v2 = await sql`SELECT viewname FROM pg_views WHERE schemaname='public' ORDER BY viewname`;
console.log("Todas las vistas:");
for (const r of v2) console.log(" ", r.viewname);

await sql.end();
