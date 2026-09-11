// =============================================================================
// scripts/audit_resultados.mjs — P2-9 (FINAL-CLOSURE-PLAN)
//
// Verifica que, para cada uno de los 10 indicadores del convenio:
//   global == Σ municipios == Σ drill-down (propuestas)
//
// Si difieren, imprime PASS/FAIL por indicador y exit code != 0.
//
// Uso:
//   DATABASE_URL=... node scripts/audit_resultados.mjs
//   node scripts/audit_resultados.mjs   # usa local dev fallback
// =============================================================================

import postgres from "postgres";

const url = process.env.DATABASE_URL
  ?? "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf";

const sql = postgres(url, { max: 1, prepare: false });

// ─── Helper: round a number to N decimals (para comparar tolerancia) ────────
const round = (n, d = 3) => Math.round(Number(n) * 10 ** d) / 10 ** d;
const eq = (a, b, tol = 0.01) => Math.abs(round(a) - round(b)) < tol;

// ─── 1) Global (mismo SQL que src/lib/repos/metas-convenio.ts) ────────────
async function getGlobal() {
  // Cada query en una posición del array; el destructuring alinea nombres.
  const [
    c1a1, c1a2_linea, c1a2_poligono, c2a1, c2a2, c3,
  ] = await Promise.all([
    // C1A1 (líneas)
    sql`
      SELECT
        round(SUM(CASE WHEN unaccent(pl.actividad) ILIKE unaccent('%cerco vivo%')
                         OR unaccent(pl.actividad) ILIKE unaccent('%cerca viva%')
                        THEN pl.longitud_km ELSE 0 END)::numeric, 3) AS km_cercos_vivos,
        round(SUM(CASE WHEN unaccent(pl.actividad) ILIKE unaccent('%alambre%')
                        THEN pl.longitud_km ELSE 0 END)::numeric, 3) AS km_alambre
      FROM sgs_pro_propuesta_linea pl
      JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
      JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE c.nombre = 'C1' AND a.nombre = 'A1'
    `,
    // C1A2 conectividad (líneas)
    sql`
      SELECT
        round(SUM(CASE WHEN unaccent(pl.actividad) ILIKE unaccent('%franja%conectividad%')
                         OR unaccent(pl.actividad) ILIKE unaccent('%conectividad%')
                        THEN pl.longitud_km ELSE 0 END)::numeric, 3) AS km_conectividad
      FROM sgs_pro_propuesta_linea pl
      JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
      JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE c.nombre = 'C1' AND a.nombre = 'A2'
    `,
    // C1A2 silvopastoril + agroforestal (polígonos)
    sql`
      SELECT
        round(SUM(CASE WHEN unaccent(pq.actividad) ILIKE unaccent('%silvopastoril%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%silvopast%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%pastos arbolados%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%pastos%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%arbol%dispers%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%arboles dispersos%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%rastrojo%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%pradera%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%potrero%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%ssp%')
                        THEN pq.area_ha ELSE 0 END)::numeric, 2) AS ha_silvopastoril,
        round(SUM(CASE WHEN unaccent(pq.actividad) ILIKE unaccent('%agroforestal%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%bosque%comestible%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%modulo%alta densidad%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%modulo%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%banco%proteina%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%banco%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%huerta%')
                         OR unaccent(pq.actividad) ILIKE unaccent('%callejon%')
                        THEN pq.area_ha ELSE 0 END)::numeric, 2) AS ha_agroforestal
      FROM sgs_pro_propuesta_poligono pq
      JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
      JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE c.nombre = 'C1' AND a.nombre = 'A2'
    `,
    // C2A1 cosecha + compostaje (puntos)
    sql`
      SELECT
        SUM(CASE WHEN unaccent(pt.actividad) ILIKE unaccent('%cosecha%')
                  THEN 1 ELSE 0 END)::int AS n_cosecha,
        SUM(CASE WHEN unaccent(pt.actividad) ILIKE unaccent('%compostaje%')
                   OR unaccent(pt.actividad) ILIKE unaccent('%compost%')
                  THEN 1 ELSE 0 END)::int AS n_compostaje
      FROM sgs_pro_propuesta_punto pt
      JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
      JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE c.nombre = 'C2' AND a.nombre = 'A1'
    `,
    // C2A2 estaciones + obras (puntos, sin C/A — alinea con P1-4)
    sql`
      SELECT
        SUM(CASE WHEN unaccent(pt.actividad) ILIKE unaccent('%estacion%limnimet%')
                   OR unaccent(pt.actividad) ILIKE unaccent('%limnimet%')
                  THEN 1 ELSE 0 END)::int AS n_estaciones,
        SUM(CASE WHEN unaccent(pt.actividad) ILIKE unaccent('%captacion%')
                   OR unaccent(pt.actividad) ILIKE unaccent('%captaci%')
                  THEN 1 ELSE 0 END)::int AS n_obras
      FROM sgs_pro_propuesta_punto pt
      JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
    `,
    // C3 predios
    sql`
      SELECT count(DISTINCT pp.id_predio)::int AS n_predios
      FROM sgs_pro_propuesta pp
      JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE c.nombre = 'C3' AND pp.id_predio IS NOT NULL
    `,
  ]);
  return {
    cercos_vivos: Number(c1a1[0]?.km_cercos_vivos ?? 0),
    alambre: Number(c1a1[0]?.km_alambre ?? 0),
    conectividad: Number(c1a2_linea[0]?.km_conectividad ?? 0),
    silvopastoril: Number(c1a2_poligono[0]?.ha_silvopastoril ?? 0),
    agroforestal: Number(c1a2_poligono[0]?.ha_agroforestal ?? 0),
    cosecha: Number(c2a1[0]?.n_cosecha ?? 0),
    compostaje: Number(c2a1[0]?.n_compostaje ?? 0),
    estaciones: Number(c2a2[0]?.n_estaciones ?? 0),
    obras_captacion: Number(c2a2[0]?.n_obras ?? 0),
    predios_c3: Number(c3[0]?.n_predios ?? 0),
  };
}

// ─── 2) Drill-down (suma de medidas de las propuestas) ────────────────────
async function getDrillDownSum(key) {
  switch (key) {
    case "cercos_vivos": {
      const r = await sql`
        SELECT round(COALESCE(SUM(pl.longitud_km), 0)::numeric, 3) AS v
        FROM sgs_pro_propuesta_linea pl
        JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
        JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
        JOIN sgs_com_componente c ON c.id_componente = a.id_componente
        WHERE c.nombre = 'C1' AND a.nombre = 'A1'
          AND (unaccent(pl.actividad) ILIKE unaccent('%cerco vivo%')
            OR unaccent(pl.actividad) ILIKE unaccent('%cerca viva%'))
      `;
      return Number(r[0]?.v ?? 0);
    }
    case "alambre": {
      const r = await sql`
        SELECT round(COALESCE(SUM(pl.longitud_km), 0)::numeric, 3) AS v
        FROM sgs_pro_propuesta_linea pl
        JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
        JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
        JOIN sgs_com_componente c ON c.id_componente = a.id_componente
        WHERE c.nombre = 'C1' AND a.nombre = 'A1'
          AND unaccent(pl.actividad) ILIKE unaccent('%alambre%')
      `;
      return Number(r[0]?.v ?? 0);
    }
    case "conectividad": {
      const r = await sql`
        SELECT round(COALESCE(SUM(pl.longitud_km), 0)::numeric, 3) AS v
        FROM sgs_pro_propuesta_linea pl
        JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
        JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
        JOIN sgs_com_componente c ON c.id_componente = a.id_componente
        WHERE c.nombre = 'C1' AND a.nombre = 'A2'
          AND (unaccent(pl.actividad) ILIKE unaccent('%franja%conectividad%')
            OR unaccent(pl.actividad) ILIKE unaccent('%conectividad%'))
      `;
      return Number(r[0]?.v ?? 0);
    }
    case "silvopastoril": {
      const r = await sql`
        SELECT round(COALESCE(SUM(pq.area_ha), 0)::numeric, 2) AS v
        FROM sgs_pro_propuesta_poligono pq
        JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
        JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
        JOIN sgs_com_componente c ON c.id_componente = a.id_componente
        WHERE c.nombre = 'C1' AND a.nombre = 'A2'
          AND (unaccent(pq.actividad) ILIKE unaccent('%silvopastoril%')
            OR unaccent(pq.actividad) ILIKE unaccent('%silvopast%')
            OR unaccent(pq.actividad) ILIKE unaccent('%pastos arbolados%')
            OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%pastos%')
            OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%arbol%dispers%')
            OR unaccent(pq.actividad) ILIKE unaccent('%arboles dispersos%')
            OR unaccent(pq.actividad) ILIKE unaccent('%rastrojo%')
            OR unaccent(pq.actividad) ILIKE unaccent('%pradera%')
            OR unaccent(pq.actividad) ILIKE unaccent('%potrero%')
            OR unaccent(pq.actividad) ILIKE unaccent('%ssp%'))
      `;
      return Number(r[0]?.v ?? 0);
    }
    case "agroforestal": {
      const r = await sql`
        SELECT round(COALESCE(SUM(pq.area_ha), 0)::numeric, 2) AS v
        FROM sgs_pro_propuesta_poligono pq
        JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
        JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
        JOIN sgs_com_componente c ON c.id_componente = a.id_componente
        WHERE c.nombre = 'C1' AND a.nombre = 'A2'
          AND (unaccent(pq.actividad) ILIKE unaccent('%agroforestal%')
            OR unaccent(pq.actividad) ILIKE unaccent('%bosque%comestible%')
            OR unaccent(pq.actividad) ILIKE unaccent('%modulo%alta densidad%')
            OR unaccent(pq.actividad) ILIKE unaccent('%modulo%')
            OR unaccent(pq.actividad) ILIKE unaccent('%banco%proteina%')
            OR unaccent(pq.actividad) ILIKE unaccent('%banco%')
            OR unaccent(pq.actividad) ILIKE unaccent('%huerta%')
            OR unaccent(pq.actividad) ILIKE unaccent('%callejon%'))
      `;
      return Number(r[0]?.v ?? 0);
    }
    case "cosecha": {
      const r = await sql`
        SELECT count(*)::int AS v
        FROM sgs_pro_propuesta_punto pt
        JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
        JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
        JOIN sgs_com_componente c ON c.id_componente = a.id_componente
        WHERE c.nombre = 'C2' AND a.nombre = 'A1'
          AND unaccent(pt.actividad) ILIKE unaccent('%cosecha%')
      `;
      return Number(r[0]?.v ?? 0);
    }
    case "compostaje": {
      const r = await sql`
        SELECT count(*)::int AS v
        FROM sgs_pro_propuesta_punto pt
        JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
        JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
        JOIN sgs_com_componente c ON c.id_componente = a.id_componente
        WHERE c.nombre = 'C2' AND a.nombre = 'A1'
          AND (unaccent(pt.actividad) ILIKE unaccent('%compostaje%')
            OR unaccent(pt.actividad) ILIKE unaccent('%compost%'))
      `;
      return Number(r[0]?.v ?? 0);
    }
    case "estaciones": {
      // P1-4: sin filtro C/A (alineado con getC2A2 global)
      const r = await sql`
        SELECT count(*)::int AS v
        FROM sgs_pro_propuesta_punto pt
        JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
        WHERE unaccent(pt.actividad) ILIKE unaccent('%estacion%limnimet%')
           OR unaccent(pt.actividad) ILIKE unaccent('%limnimet%')
      `;
      return Number(r[0]?.v ?? 0);
    }
    case "obras_captacion": {
      const r = await sql`
        SELECT count(*)::int AS v
        FROM sgs_pro_propuesta_punto pt
        JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
        WHERE unaccent(pt.actividad) ILIKE unaccent('%captacion%')
           OR unaccent(pt.actividad) ILIKE unaccent('%captaci%')
      `;
      return Number(r[0]?.v ?? 0);
    }
    case "predios_c3": {
      const r = await sql`
        SELECT count(DISTINCT pp.id_predio)::int AS v
        FROM sgs_pro_propuesta pp
        JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
        JOIN sgs_com_componente c ON c.id_componente = a.id_componente
        WHERE c.nombre = 'C3' AND pp.id_predio IS NOT NULL
      `;
      return Number(r[0]?.v ?? 0);
    }
    default:
      throw new Error(`Unknown indicator key: ${key}`);
  }
}

(async () => {
  const indicators = [
    "cercos_vivos", "alambre", "conectividad", "silvopastoril", "agroforestal",
    "cosecha", "compostaje", "estaciones", "obras_captacion", "predios_c3",
  ];

  console.log("=== audit:resultados — reconciliación global == drill-down ===\n");

  const global = await getGlobal();
  console.log("Global:");
  for (const k of indicators) console.log(`  ${k.padEnd(16)} = ${global[k]}`);
  console.log();

  let pass = 0;
  let fail = 0;
  for (const k of indicators) {
    const drill = await getDrillDownSum(k);
    const ok = eq(global[k], drill);
    const status = ok ? "✅" : "❌";
    console.log(`  ${status} ${k.padEnd(16)} global=${global[k]}  drill-down=${drill}  ${ok ? "PASS" : "FAIL"}`);
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
