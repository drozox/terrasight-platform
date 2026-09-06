// Test rápido: invocar getPredioAnalisisCompleto con un id_predio real
import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

// Tomar un id_predio con datos
const sample = await sql`
  SELECT ip.id_predio
  FROM   sgs_ind_predio ip
  LIMIT  3
`;
console.log("Sample predios con indicador:");
for (const r of sample) console.log(" ", r.id_predio);

// Para cada uno, contar las relaciones
for (const r of sample) {
  const id = r.id_predio;
  const counts = await sql`
    SELECT
      (SELECT count(*)::int FROM sgs_ind_predio WHERE id_predio = ${id}) AS ind,
      (SELECT count(*)::int FROM sgs_ind_ambiental_predio WHERE id_predio = ${id}) AS amb,
      (SELECT count(*)::int FROM sgs_ind_hidrico_predio WHERE id_predio = ${id}) AS hid,
      (SELECT count(*)::int FROM sgs_ind_intervencion_predio WHERE id_predio = ${id}) AS ivn,
      (SELECT count(*)::int FROM sgs_rel_predio_cobertura WHERE id_predio = ${id}) AS cob,
      (SELECT count(*)::int FROM sgs_rel_predio_bioma WHERE id_predio = ${id}) AS bio,
      (SELECT count(*)::int FROM sgs_rel_predio_paramos WHERE id_predio = ${id}) AS par,
      (SELECT count(*)::int FROM sgs_rel_predio_zonificacion_pomca WHERE id_predio = ${id}) AS pom,
      (SELECT count(*)::int FROM sgs_rel_predio_zonificacion_rfp WHERE id_predio = ${id}) AS rfp
  `;
  console.log(`  Predio ${id}:`, counts[0]);
}

await sql.end();
