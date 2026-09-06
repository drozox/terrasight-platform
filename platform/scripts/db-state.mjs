import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, {max:1, onnotice:()=>{}});
const r = await sql`
  SELECT
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public') AS tables,
    (SELECT count(*)::int FROM information_schema.views WHERE table_schema='public') AS views,
    (SELECT count(*)::int FROM bcs_lpa_municipio) AS municipio,
    (SELECT count(*)::int FROM bcs_lpa_vereda) AS vereda,
    (SELECT count(*)::int FROM bcs_dh_microcuenca) AS microcuenca,
    (SELECT count(*)::int FROM sgs_pre_propietario) AS propietario,
    (SELECT count(*)::int FROM sgs_pre_predio) AS predio,
    (SELECT count(*)::int FROM sgs_com_componente) AS componente,
    (SELECT count(*)::int FROM sgs_com_accion) AS accion,
    (SELECT count(*)::int FROM sgs_pro_propuesta) AS prop_super,
    (SELECT count(*)::int FROM sgs_pro_propuesta_punto) AS prop_punto,
    (SELECT count(*)::int FROM sgs_pro_propuesta_linea) AS prop_linea,
    (SELECT count(*)::int FROM sgs_pro_propuesta_poligono) AS prop_poligono,
    (SELECT count(*)::int FROM sgs_amb_bioma) AS bioma,
    (SELECT count(*)::int FROM sgs_amb_paramos) AS paramos,
    (SELECT count(*)::int FROM sgs_amb_zonificacion_pomca) AS pomca,
    (SELECT count(*)::int FROM sgs_amb_zonificacion_rfp) AS rfp,
    (SELECT count(*)::int FROM sgs_inf_via) AS via,
    (SELECT count(*)::int FROM sgs_inf_drenaje_simple) AS drenaje,
    (SELECT count(*)::int FROM sgs_adm_usuario) AS usuarios
`;
console.log("=== Estado actual de la DB ===");
for (const [k, v] of Object.entries(r[0])) {
  console.log(`  ${k.padEnd(15)}: ${v}`);
}
await sql.end({timeout:1});
