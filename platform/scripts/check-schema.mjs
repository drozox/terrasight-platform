import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const t = await sql`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'`;
const v = await sql`SELECT count(*)::int n FROM information_schema.views WHERE table_schema='public'`;
console.log("Tablas:", t[0].n, "Vistas:", v[0].n);
const names = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
for (const r of names) console.log(" ", r.table_name);
await sql.end({timeout:1});
