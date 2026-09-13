// =============================================================================
// scripts/audit_resultados.mjs — P2-9 (FINAL-CLOSURE-PLAN)
//
// Reconciliación de indicadores del convenio. AHORA usa la FUENTE ÚNICA
// (migración 36):
//   - sgs_v_indicador_global     → valor global por indicador
//   - sgs_v_indicador_propuesta  → detalle por propuesta
//
// Verifica:
//   1. Que los 10 indicadores oficiales aparezcan en la vista global.
//   2. Que global == agregación del detalle (drill-down) para cada indicador
//      (valida la lógica de `agregacion`: count_distinct_predio vs sum).
//
// Antes este script reimplementaba los 10 patrones de ILIKE (4ª copia del
// negocio). Ahora solo consume la vista — si divergiera de la app, sería
// imposible, porque ambos leen la misma fuente.
//
// Uso:
//   DATABASE_URL=... node scripts/audit_resultados.mjs
//   node scripts/audit_resultados.mjs   # usa local dev fallback
// =============================================================================

import postgres from "postgres";

const url = process.env.DATABASE_URL
  ?? "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf";

const sql = postgres(url, { max: 1, prepare: false });

const EXPECTED_KEYS = [
  "cercos_vivos", "alambre", "conectividad", "silvopastoril", "agroforestal",
  "cosecha", "compostaje", "estaciones", "obras_captacion", "predios_c3",
];

const round = (n, d = 3) => Math.round(Number(n) * 10 ** d) / 10 ** d;
const eq = (a, b, tol = 0.01) => Math.abs(round(a) - round(b)) < tol;

(async () => {
  console.log("=== audit:resultados — reconciliación (fuente única, migración 36) ===\n");

  const globalRows = await sql`
    SELECT indicador_key, actual, unidad
    FROM   sgs_v_indicador_global
    ORDER  BY indicador_key
  `;
  const global = Object.fromEntries(
    globalRows.map((r) => [r.indicador_key, { actual: Number(r.actual), unidad: r.unidad }]),
  );

  const drillRows = await sql`
    SELECT indicador_key,
           CASE
             WHEN max(agregacion) = 'count_distinct_predio'
               THEN count(DISTINCT id_predio)::numeric
             ELSE COALESCE(SUM(medida), 0)::numeric
           END AS v
    FROM   sgs_v_indicador_propuesta
    GROUP  BY indicador_key
  `;
  const drill = Object.fromEntries(
    drillRows.map((r) => [r.indicador_key, Number(r.v)]),
  );

  console.log("Global (vista sgs_v_indicador_global):");
  for (const k of EXPECTED_KEYS) {
    const g = global[k];
    console.log(`  ${k.padEnd(16)} = ${g ? g.actual : "—"} ${g ? g.unidad : ""}`);
  }
  console.log();

  let pass = 0;
  let fail = 0;

  // 1) Todos los indicadores esperados existen
  for (const k of EXPECTED_KEYS) {
    const ok = k in global;
    const status = ok ? "✅" : "❌";
    console.log(`  ${status} ${k.padEnd(16)} presente en la vista global ${ok ? "" : "— FALTA"}`);
    if (ok) pass++; else fail++;
  }

  // 2) global == suma del detalle
  console.log("\nReconciliación global == detalle:");
  for (const k of EXPECTED_KEYS) {
    if (!(k in global)) continue;
    const g = global[k].actual;
    const d = drill[k] ?? 0;
    const ok = eq(g, d);
    const status = ok ? "✅" : "❌";
    console.log(`  ${status} ${k.padEnd(16)} global=${g}  detalle=${d}  ${ok ? "PASS" : "FAIL"}`);
    if (ok) pass++; else fail++;
  }

  console.log();
  console.log(`Resumen: ${pass} PASS, ${fail} FAIL`);
  await sql.end();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error("audit:resultados error:", e);
  process.exit(1);
});
