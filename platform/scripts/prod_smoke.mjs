// =============================================================================
// prod_smoke.mjs — Verificación pre-producción
//
// Ejecuta una batería de tests para confirmar que la DB está lista.
// Uso:  $env:DATABASE_URL="..."; node scripts/prod_smoke.mjs
// =============================================================================

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }
const sql = postgres(url, { max: 4, onnotice: () => {} });

let pass = 0, fail = 0;

function check(name, condition, detail = "") {
  if (condition) { pass++; console.log(`  ✓ ${name}${detail ? "  — " + detail : ""}`); }
  else          { fail++; console.log(`  ✗ ${name}${detail ? "  — " + detail : ""}`); }
}

console.log("\n=== 1. Conteos de las 32 tablas principales ===");
const counts = await sql`
  SELECT
    (SELECT count(*)::int FROM bcs_lpa_municipio)        AS municipio,
    (SELECT count(*)::int FROM bcs_lpa_vereda)           AS vereda,
    (SELECT count(*)::int FROM bcs_dh_microcuenca)       AS microcuenca,
    (SELECT count(*)::int FROM bcs_dh_quebrada)          AS quebrada,
    (SELECT count(*)::int FROM sgs_pre_propietario)      AS propietario,
    (SELECT count(*)::int FROM sgs_pre_predio)           AS predio,
    (SELECT count(*)::int FROM sgs_com_componente)       AS componente,
    (SELECT count(*)::int FROM sgs_com_accion)           AS accion,
    (SELECT count(*)::int FROM sgs_pro_propuesta)        AS super,
    (SELECT count(*)::int FROM sgs_pro_propuesta_punto)  AS prop_punto,
    (SELECT count(*)::int FROM sgs_pro_propuesta_linea)  AS prop_linea,
    (SELECT count(*)::int FROM sgs_pro_propuesta_poligono) AS prop_poligono,
    (SELECT count(*)::int FROM sgs_amb_bioma)            AS bioma,
    (SELECT count(*)::int FROM sgs_amb_paramos)          AS paramos,
    (SELECT count(*)::int FROM sgs_amb_cobertura_clc)    AS cobertura,
    (SELECT count(*)::int FROM sgs_amb_zonificacion_pomca) AS pomca,
    (SELECT count(*)::int FROM sgs_amb_zonificacion_rfp) AS rfp,
    (SELECT count(*)::int FROM sgs_inf_via)              AS via,
    (SELECT count(*)::int FROM sgs_inf_drenaje_simple)   AS drenaje_simple,
    (SELECT count(*)::int FROM sgs_inf_drenaje_doble)    AS drenaje_doble,
    (SELECT count(*)::int FROM sgs_rel_predio_cobertura) AS rel_cob,
    (SELECT count(*)::int FROM sgs_rel_predio_bioma)     AS rel_bio,
    (SELECT count(*)::int FROM sgs_rel_predio_paramos)   AS rel_par,
    (SELECT count(*)::int FROM sgs_rel_predio_zonificacion_pomca) AS rel_pom,
    (SELECT count(*)::int FROM sgs_rel_predio_zonificacion_rfp)   AS rel_rfp,
    (SELECT count(*)::int FROM sgs_ind_predio)           AS ind_p,
    (SELECT count(*)::int FROM sgs_ind_ambiental_predio) AS ind_a,
    (SELECT count(*)::int FROM sgs_ind_hidrico_predio)   AS ind_h,
    (SELECT count(*)::int FROM sgs_ind_intervencion_predio) AS ind_i,
    (SELECT count(*)::int FROM sgs_ind_municipio)        AS ind_m
  FROM (SELECT 1) x
`;
const c = counts[0];
const expectations = {
  municipio: [20, 25], vereda: [500, 700], microcuenca: [30, 50], quebrada: [500, 1000],
  propietario: [40, 80], predio: [120, 150], componente: [3, 5], accion: [5, 15],
  super: [1300, 1500], prop_punto: [600, 800], prop_linea: [400, 500], prop_poligono: [200, 300],
  bioma: [5, 10], paramos: [5, 15], cobertura: [100, 200], pomca: [200, 300], rfp: [400, 600],
  via: [10000, 25000], drenaje_simple: [1000, 2000], drenaje_doble: [5, 15],
  rel_cob: [100, 200], rel_bio: [80, 200], rel_par: [25, 60], rel_pom: [80, 200], rel_rfp: [25, 60],
  ind_p: [100, 200], ind_a: [100, 200], ind_h: [100, 200], ind_i: [100, 200], ind_m: [10, 20]
};
for (const [k, [lo, hi]] of Object.entries(expectations)) {
  check(`count(${k})`, c[k] >= lo && c[k] <= hi, `${c[k]} (esperado ${lo}..${hi})`);
}

console.log("\n=== 2. Integridad referencial (huérfanos = 0) ===");
const fkChecks = [
  ["FK cobertura → cobertura_clc", "SELECT count(*)::int AS n FROM sgs_rel_predio_cobertura r WHERE NOT EXISTS (SELECT 1 FROM sgs_amb_cobertura_clc c WHERE c.id_cobertura = r.id_cobertura)"],
  ["FK bioma → bioma", "SELECT count(*)::int AS n FROM sgs_rel_predio_bioma r WHERE NOT EXISTS (SELECT 1 FROM sgs_amb_bioma b WHERE b.id_bioma = r.id_bioma)"],
  ["FK junction cobertura → predio", "SELECT count(*)::int AS n FROM sgs_rel_predio_cobertura r WHERE NOT EXISTS (SELECT 1 FROM sgs_pre_predio p WHERE p.id_predio = r.id_predio)"],
  ["FK ind_predio → predio", "SELECT count(*)::int AS n FROM sgs_ind_predio i WHERE NOT EXISTS (SELECT 1 FROM sgs_pre_predio p WHERE p.id_predio = i.id_predio)"],
  ["FK ind_municipio → municipio", "SELECT count(*)::int AS n FROM sgs_ind_municipio i WHERE NOT EXISTS (SELECT 1 FROM bcs_lpa_municipio m WHERE m.id_municipio = i.id_municipio)"],
  ["FK super → accion", "SELECT count(*)::int AS n FROM sgs_pro_propuesta p WHERE id_accion IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sgs_com_accion a WHERE a.id_accion = p.id_accion)"],
  ["FK super → predio (no-null)", "SELECT count(*)::int AS n FROM sgs_pro_propuesta p WHERE id_predio IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sgs_pre_predio pr WHERE pr.id_predio = p.id_predio)"],
  ["FK hija punto → super", "SELECT count(*)::int AS n FROM sgs_pro_propuesta_punto p WHERE id_propuesta IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sgs_pro_propuesta s WHERE s.id_propuesta = p.id_propuesta)"],
];
for (const [name, query] of fkChecks) {
  const r = await sql.unsafe(query);
  check(name, r[0].n === 0, `huérfanos: ${r[0].n}`);
}

console.log("\n=== 3. Cobertura espacial (geom no nulas) ===");
const geomChecks = [
  ["Predios con geom", "SELECT count(*)::int AS n FROM sgs_pre_predio WHERE geom IS NOT NULL"],
  ["Municipios con geom", "SELECT count(*)::int AS n FROM bcs_lpa_municipio WHERE geom IS NOT NULL"],
  ["Veredas con geom", "SELECT count(*)::int AS n FROM bcs_lpa_vereda WHERE geom IS NOT NULL"],
  ["Vias con geom", "SELECT count(*)::int AS n FROM sgs_inf_via WHERE geom IS NOT NULL"],
  ["Cobertura CLC con geom", "SELECT count(*)::int AS n FROM sgs_amb_cobertura_clc WHERE geom IS NOT NULL"],
  ["POMCA con geom", "SELECT count(*)::int AS n FROM sgs_amb_zonificacion_pomca WHERE geom IS NOT NULL"],
  ["RFP con geom", "SELECT count(*)::int AS n FROM sgs_amb_zonificacion_rfp WHERE geom IS NOT NULL"],
  ["Quebradas con geom", "SELECT count(*)::int AS n FROM bcs_dh_quebrada WHERE geom IS NOT NULL"],
  ["Drenaje doble con geom", "SELECT count(*)::int AS n FROM sgs_inf_drenaje_doble WHERE geom IS NOT NULL"],
];
for (const [name, query] of geomChecks) {
  const r = await sql.unsafe(query);
  check(name, r[0].n > 0, `count=${r[0].n}`);
}

console.log("\n=== 4. Performance de queries Fase 6 (latencia en ms) ===");
async function timeQuery(name, query) {
  const t0 = Date.now();
  await sql.unsafe(query);
  const ms = Date.now() - t0;
  check(name, ms < 1000, `${ms}ms (umbral <1000ms)`);
}
await timeQuery("getPredioAnalisisCompleto (joins Fase 6)",
  `SELECT p.id_predio, p.microcuenca, p.num_coberturas, a.tipo_bioma_predominante
   FROM sgs_ind_predio p
   LEFT JOIN sgs_ind_ambiental_predio a USING (id_predio)
   WHERE p.id_predio = 20103069`);
await timeQuery("getCoberturaVegetal (SUM + GROUP BY)",
  `SELECT c.nombre_cobertura, COALESCE(SUM(pc.area_interseccion_ha), 0)::numeric AS area
   FROM sgs_rel_predio_cobertura pc
   JOIN sgs_amb_cobertura_clc c ON c.id_cobertura = pc.id_cobertura
   GROUP BY c.nombre_cobertura ORDER BY area DESC`);
await timeQuery("getIndicadoresMunicipio (todos los municipios)",
  `SELECT m.nombre_municipio, im.* FROM sgs_ind_municipio im
   JOIN bcs_lpa_municipio m ON m.id_municipio = im.id_municipio
   ORDER BY m.nombre_municipio`);
await timeQuery("getIntervencionesRecientes (con joins)",
  `SELECT pp.id_propuesta, pp.tipo, pr.nombre_predio, c.nombre
   FROM sgs_pro_propuesta pp
   JOIN sgs_pre_predio pr ON pr.id_predio = pp.id_predio
   JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
   JOIN sgs_com_componente c ON c.id_componente = a.id_componente
   ORDER BY pp.id_propuesta ASC LIMIT 10`);
await timeQuery("ST_Intersects spatial test",
  `SELECT p.id_predio, m.nombre_municipio
   FROM sgs_pre_predio p, bcs_lpa_municipio m
   WHERE ST_Intersects(p.geom, m.geom) LIMIT 5`);

console.log("\n=== 5. Coherencia junction + indicator ===");
const ch = await sql`
  SELECT
    (SELECT count(DISTINCT id_predio)::int FROM sgs_ind_predio) AS ind_predios,
    (SELECT count(DISTINCT id_predio)::int FROM sgs_rel_predio_cobertura) AS cob_predios,
    (SELECT count(DISTINCT id_predio)::int FROM sgs_pro_propuesta WHERE id_predio IS NOT NULL) AS super_predios,
    (SELECT count(*)::int FROM sgs_pre_predio) AS total_predios
`;
check("indicator_predio cubre predios", ch[0].ind_predios >= ch[0].total_predios - 5,
  `${ch[0].ind_predios}/${ch[0].total_predios} predios`);
check("super_propuesta con id_predio ≤ total predios", ch[0].super_predios <= ch[0].total_predios,
  `${ch[0].super_predios}/${ch[0].total_predios}`);

console.log("\n=== 6. Auth + Vistas metas ===");
const users = await sql`SELECT count(*)::int AS n FROM sgs_adm_usuario`;
const roles = await sql`SELECT count(*)::int AS n FROM sgs_adm_rol`;
check("Al menos 1 rol configurado", roles[0].n >= 1, `${roles[0].n} roles`);
const vMetas = await sql`SELECT count(*)::int AS n FROM pg_views WHERE schemaname='public' AND (viewname LIKE 'sgs_v_metas%' OR viewname LIKE 'sgs_v_municipios%')`;
check("Vistas de metas (sgs_v_metas_* + sgs_v_municipios_*)", vMetas[0].n >= 3, `${vMetas[0].n} vistas`);

console.log(`\n=== Resumen: ${pass} pass, ${fail} fail ===`);
await sql.end({ timeout: 5 });
process.exit(fail > 0 ? 1 : 0);
