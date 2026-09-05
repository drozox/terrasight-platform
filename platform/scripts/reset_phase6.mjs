import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

const t = [
  "sgs_rel_predio_cobertura",
  "sgs_rel_predio_bioma",
  "sgs_rel_predio_paramos",
  "sgs_rel_predio_zonificacion_pomca",
  "sgs_rel_predio_zonificacion_rfp",
  "sgs_ind_predio",
  "sgs_ind_ambiental_predio",
  "sgs_ind_hidrico_predio",
  "sgs_ind_intervencion_predio",
  "sgs_ind_municipio",
];

console.log("TRUNCATE Fase 6 (10 tablas)...");
await sql.unsafe(`TRUNCATE ${t.map(x => `"${x}"`).join(", ")} RESTART IDENTITY CASCADE`);

const c = await sql`
  SELECT
    (SELECT count(*)::int FROM sgs_rel_predio_cobertura) AS cob,
    (SELECT count(*)::int FROM sgs_rel_predio_bioma) AS bio,
    (SELECT count(*)::int FROM sgs_ind_predio) AS ind_p,
    (SELECT count(*)::int FROM sgs_ind_municipio) AS ind_m
`;
console.log("Post-TRUNCATE counts:", c[0]);
await sql.end();
