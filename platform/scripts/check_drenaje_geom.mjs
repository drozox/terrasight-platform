import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

const r = await sql`SELECT id_drenaje_doble, nombre_geografico, geom IS NULL AS sin_geom FROM sgs_inf_drenaje_doble ORDER BY id_drenaje_doble`;
console.log("Drenaje doble:");
for (const row of r) console.log(" ", JSON.stringify(row));

const r2 = await sql`SELECT id_quebrada, nombre_quebrada, geom IS NULL AS sin_geom FROM bcs_dh_quebrada ORDER BY id_quebrada LIMIT 5`;
console.log("\nQuebrada sample:");
for (const row of r2) console.log(" ", JSON.stringify(row));

await sql.end();
