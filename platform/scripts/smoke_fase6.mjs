// Smoke test: getPredioAnalisisCompleto para un id_predio con muchas relaciones
import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

// Encontrar el id_predio con más relaciones
const top = await sql`
  SELECT p.id_predio, COUNT(DISTINCT pc.id_cobertura) + COUNT(DISTINCT pb.id_bioma) +
         COUNT(DISTINCT pp.id_paramos) + COUNT(DISTINCT pz.id_zonificacion_pomca) +
         COUNT(DISTINCT pr.id_zonificacion_rfp) AS total_relaciones
  FROM sgs_pre_predio p
  LEFT JOIN sgs_rel_predio_cobertura pc ON pc.id_predio = p.id_predio
  LEFT JOIN sgs_rel_predio_bioma pb ON pb.id_predio = p.id_predio
  LEFT JOIN sgs_rel_predio_paramos pp ON pp.id_predio = p.id_predio
  LEFT JOIN sgs_rel_predio_zonificacion_pomca pz ON pz.id_predio = p.id_predio
  LEFT JOIN sgs_rel_predio_zonificacion_rfp pr ON pr.id_predio = p.id_predio
  GROUP BY p.id_predio
  ORDER BY total_relaciones DESC
  LIMIT 5
`;
console.log("Top 5 predios con más relaciones:");
for (const r of top) console.log(`  ${r.id_predio}: ${r.total_relaciones} relaciones`);

// Probar el primero
const id = top[0].id_predio;
console.log(`\n--- Análisis completo para id_predio=${id} ---`);

const ind = await sql`SELECT * FROM sgs_ind_predio WHERE id_predio = ${id}`;
console.log("Indicador:", ind[0]);

const amb = await sql`SELECT * FROM sgs_ind_ambiental_predio WHERE id_predio = ${id}`;
console.log("Ambiental:", amb[0]);

const hid = await sql`SELECT * FROM sgs_ind_hidrico_predio WHERE id_predio = ${id}`;
console.log("Hídrico:", hid[0]);

const ivn = await sql`SELECT * FROM sgs_ind_intervencion_predio WHERE id_predio = ${id}`;
console.log("Intervención:", ivn[0]);

const cob = await sql`
  SELECT c.nombre_cobertura, pc.area_interseccion_ha, pc.porcentaje_predio
  FROM   sgs_rel_predio_cobertura pc
  JOIN   sgs_amb_cobertura_clc c ON c.id_cobertura = pc.id_cobertura
  WHERE  pc.id_predio = ${id} ORDER BY pc.porcentaje_predio DESC NULLS LAST
`;
console.log(`Coberturas (${cob.length}):`);
for (const r of cob) console.log(" ", r);

const bio = await sql`
  SELECT b.bioma_iavh, pb.porcentaje_predio
  FROM   sgs_rel_predio_bioma pb
  JOIN   sgs_amb_bioma b ON b.id_bioma = pb.id_bioma
  WHERE  pb.id_predio = ${id} ORDER BY pb.porcentaje_predio DESC NULLS LAST
`;
console.log(`Biomas (${bio.length}):`);
for (const r of bio) console.log(" ", r);

// Indicadores por municipio
console.log("\n--- Top 5 municipios por num_predios (sgs_ind_municipio) ---");
const mun = await sql`
  SELECT m.nombre_municipio, im.* FROM sgs_ind_municipio im
  JOIN bcs_lpa_municipio m ON m.id_municipio = im.id_municipio
  ORDER BY im.num_predios DESC NULLS LAST LIMIT 5
`;
for (const r of mun) console.log(` ${r.nombre_municipio}: ${r.num_predios} predios, ${Number(r.area_total_ha).toFixed(0)} ha total`);

await sql.end();
