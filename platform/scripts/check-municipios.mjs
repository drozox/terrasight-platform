import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const r = await sql`SELECT id_municipio, codigo_administrativo, nombre_municipio FROM bcs_lpa_municipio ORDER BY id_municipio`;
for (const x of r) console.log(`  ${x.id_municipio} | ${x.codigo_administrativo} | ${x.nombre_municipio}`);
console.log(`Total: ${r.length}`);
await sql.end({timeout:1});
