import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

const c = await sql`
  SELECT
    (SELECT count(*)::int FROM sgs_amb_cobertura_clc) AS cob,
    (SELECT count(*)::int FROM sgs_amb_zonificacion_rfp) AS rfp,
    (SELECT count(*)::int FROM sgs_amb_zonificacion_pomca) AS pomca
`;
console.log("Counts:", c[0]);
const ids = await sql`SELECT id_zonificacion_rfp FROM sgs_amb_zonificacion_rfp ORDER BY id_zonificacion_rfp`;
console.log("RFP first 5 ids:", ids.slice(0, 5).map(r=>r.id_zonificacion_rfp).join(","));
console.log("RFP last 5 ids:", ids.slice(-5).map(r=>r.id_zonificacion_rfp).join(","));
console.log("RFP total rows:", ids.length);
const sample = await sql`SELECT id_zonificacion_rfp, categoria_zonificacion, nombre FROM sgs_amb_zonificacion_rfp ORDER BY id_zonificacion_rfp LIMIT 5`;
console.log("Sample RFP rows:");
for (const r of sample) console.log(" ", r);
await sql.end();
