// =============================================================================
// verify-migrations.mjs — corre las queries de verificación de DEPLOY.md
//   sección 1.5 contra la BD apuntada por DATABASE_URL.
//   Imprime PASS/FAIL por query + tabla resumen.
//
//   Uso:
//     $env:DATABASE_URL = "postgresql://..."
//     node scripts/verify-migrations.mjs
// =============================================================================

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[verify] Falta DATABASE_URL en el env");
  process.exit(1);
}

const maskedUrl = url.replace(/:[^:@/]+@/, ":***@");
console.log(`[verify] Conectando a: ${maskedUrl}\n`);
const sql = postgres(url, { max: 1, onnotice: () => {} });

const results = [];

// Helper para registrar PASS/FAIL.
function record(name, expected, got) {
  const ok = String(got) === String(expected);
  results.push({ name, expected, got, ok });
  const tag = ok ? "✅ PASS" : "❌ FAIL";
  console.log(`  ${tag}  ${name}: esperado=${expected}, real=${got}`);
}

try {
  // -- Query 1: tablas sgs_* y bcs_* (core de SIG TERRITORIO)
  //    (Supabase puede tener tablas extra del usuario; verificamos las nuestras)
  {
    const r = await sql`
      SELECT count(*)::int AS n FROM information_schema.tables
      WHERE table_schema = 'public' AND (table_name LIKE 'sgs\\_%' ESCAPE '\\' OR table_name LIKE 'bcs\\_%' ESCAPE '\\')
    `;
    console.log(`  ℹ️  Tablas sgs_* + bcs_* en schema public: ${r.n} (esperado >= 32 — puede haber más por datos del usuario)`);
  }

  // -- Query 2: 10 propuestas (si tiene el seed)
  {
    const [r] = await sql`SELECT count(*)::int AS n FROM sgs_pro_propuesta`;
    record("Propuestas (con seed demo)", "10", r.n);
  }

  // -- Query 3: 10 predios
  {
    const [r] = await sql`SELECT count(*)::int AS n FROM sgs_pre_predio`;
    record("Predios (con seed demo)", "10", r.n);
  }

  // -- Query 4: ✨ 6 acciones (C1A1, C1A2, C2A1, C2A2, C3A1, C3A2)
  {
    const [r] = await sql`SELECT count(*)::int AS n FROM sgs_com_accion`;
    record("Acciones en sgs_com_accion (era 4, ahora 6 con C3)", "6", r.n);
  }

  // -- Query 5: 5 alertas
  {
    const [r] = await sql`SELECT count(*)::int AS n FROM sgs_amb_alerta`;
    record("Alertas en sgs_amb_alerta", "5", r.n);
  }

  // -- Query 6: ✨ Lockout columns
  {
    const r = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sgs_adm_usuario'
        AND column_name IN ('intentos_fallidos', 'bloqueado_hasta')
    `;
    const cols = r.map((x) => x.column_name).sort().join(",");
    record("Lockout columns en sgs_adm_usuario", "bloqueado_hasta,intentos_fallidos", cols);
  }

  // -- Query 7: ✨ Fuente única de indicadores (36) + deprecadas eliminadas (37)
  {
    const r = await sql`
      SELECT viewname FROM pg_views
      WHERE schemaname = 'public' AND viewname LIKE 'sgs_v_indicador%'
      ORDER BY viewname
    `;
    const v = r.map((x) => x.viewname).join(",");
    record(
      "Vistas fuente única (2 esperadas)",
      "sgs_v_indicador_global,sgs_v_indicador_propuesta",
      v,
    );
  }
  {
    const [r] = await sql`
      SELECT count(*)::int AS n FROM pg_views
      WHERE schemaname = 'public'
        AND (viewname LIKE 'sgs_v_metas%' OR viewname LIKE 'sgs_v_municipios%')
    `;
    record("Vistas de metas deprecadas eliminadas", "0", r.n);
  }

  // -- Query 8: ✨ 10 indicadores + multiestrat en la fuente única
  {
    const [r] = await sql`SELECT count(*)::int AS n FROM sgs_v_indicador_global`;
    record("Indicadores en sgs_v_indicador_global (10 + multiestrat)", "11", r.n);
  }

  // -- Query 9: ✨ C3A1 y C3A2 existen
  {
    const r = await sql`
      SELECT a.nombre, c.nombre AS componente
      FROM sgs_com_accion a
      JOIN sgs_com_componente c ON a.id_componente = c.id_componente
      WHERE c.nombre = 'C3'
      ORDER BY a.nombre
    `;
    const v = r.map((x) => `${x.componente}${x.nombre}`).join(",");
    record("Acciones C3 (A1 + A2)", "C3A1,C3A2", v);
  }

  // -- Query 10: ✨ Indicador C3 presente en la fuente única
  {
    const r = await sql`
      SELECT actual FROM sgs_v_indicador_global WHERE indicador_key = 'predios_c3'
    `;
    if (r.length === 0) {
      results.push({ name: "predios_c3 en sgs_v_indicador_global", expected: "1 fila", got: "0 filas", ok: false });
      console.log(`  ❌ FAIL  predios_c3: 0 filas en la fuente única`);
    } else {
      const got = `actual=${r[0].actual}`;
      results.push({ name: "predios_c3 en sgs_v_indicador_global", expected: "1 fila", got, ok: true });
      console.log(`  ✅ PASS  predios_c3: ${got}`);
    }
  }

  // -- Query 11: Global (leer los 11 indicadores de la fuente única)
  {
    const r = await sql`SELECT indicador_key, actual, unidad FROM sgs_v_indicador_global ORDER BY indicador_key`;
    console.log(`  ℹ️  Indicadores (fuente única):`);
    for (const x of r) console.log(`     - ${x.indicador_key}: ${x.actual} ${x.unidad}`);
  }

  // Resumen
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n[verify] Resultado: ${passed} PASS, ${failed} FAIL, ${results.length} total`);

  if (failed > 0) {
    console.log("\n[verify] FALLAS:");
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  ❌ ${r.name}: esperado=${r.expected}, real=${r.got}`);
    }
  }

  await sql.end({ timeout: 1 });
  process.exit(failed > 0 ? 1 : 0);
} catch (err) {
  console.error(`[verify] ERROR: ${err.message}`);
  await sql.end({ timeout: 1 });
  process.exit(1);
}
