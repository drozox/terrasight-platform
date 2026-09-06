import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

const c = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'sgs_amb_zonificacion_pomca' ORDER BY ordinal_position`;
console.log("POMCA cols:", c.map(x => x.column_name).join(", "));

const s = await sql`SELECT id_zonificacion_pomca, categoria_zonificacion, nomenclatura, codigo FROM sgs_amb_zonificacion_pomca ORDER BY id_zonificacion_pomca LIMIT 10`;
for (const r of s) console.log(" ", JSON.stringify(r));

const cat_count = await sql`SELECT categoria_zonificacion, count(*)::int as n FROM sgs_amb_zonificacion_pomca GROUP BY categoria_zonificacion ORDER BY n DESC`;
console.log("\nCategoria distribution:");
for (const r of cat_count) console.log(" ", r);

const nom_count = await sql`SELECT nomenclatura, count(*)::int as n FROM sgs_amb_zonificacion_pomca GROUP BY nomenclatura ORDER BY n DESC LIMIT 20`;
console.log("\nNomenclatura distribution:");
for (const r of nom_count) console.log(" ", r);

await sql.end();
