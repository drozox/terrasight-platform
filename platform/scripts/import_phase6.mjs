#!/usr/bin/env node
// =============================================================================
// import_phase6.mjs — Importa las 10 tablas de Fase 6 a Supabase (Phase 7).
//
// Decisiones de mapping:
//   - id_predio del junction viene de CSV `ID_predio` (NO `FID_sgs_pre_predio`)
//   - Lookup por nombre natural key (no por FID del GDB, que tiene duplicados)
//   - CSV parser maneja quotes RFC 4180
//   - Batch insert con UNNEST() + arrays pre-formateados para velocidad
//     (sql.array() no funciona con multi-arg UNNEST; usamos literal {1,2,3})
//
// Source: C:\dev\scratch\gdb_export\phase6\ (CSV desde el GDB)
// =============================================================================

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const PHASE6_DIR = process.env.PHASE6_DIR || "C:\\dev\\scratch\\gdb_export\\phase6";
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) { console.error("[phase6] Falta DATABASE_URL"); process.exit(1); }

const sql = postgres(DB_URL, { max: 8, onnotice: () => {} });

// =============================================================================
// Junction tables: lookup configs
// =============================================================================
const JUNCTION_CONFIGS = {
  sgs_rel_predio_cobertura: {
    id_predio_col: "ID_predio",
    lookup_table: "sgs_amb_cobertura_clc",
    lookup_col: "nombre_cobertura",
    gdb_target_col: "nombre",
    fk_col: "id_cobertura",
  },
  sgs_rel_predio_bioma: {
    id_predio_col: "ID_predio",
    lookup_table: "sgs_amb_bioma",
    lookup_col: "bioma_iavh",
    gdb_target_col: "bioma_IAvH",
    fk_col: "id_bioma",
  },
  sgs_rel_predio_paramos: {
    id_predio_col: "ID_predio",
    lookup_table: "sgs_amb_paramos",
    lookup_col: "nombre_paramo",
    gdb_target_col: "NOMBRE",
    fk_col: "id_paramos",
  },
  sgs_rel_predio_zonificacion_pomca: {
    id_predio_col: "ID_predio",
    lookup_table: "sgs_amb_zonificacion_pomca",
    lookup_col: "categoria_zonificacion",
    gdb_target_col: "CAT_ORD",
    fk_col: "id_zonificacion_pomca",
  },
  sgs_rel_predio_zonificacion_rfp: {
    id_predio_col: "ID_predio",
    lookup_table: "sgs_amb_zonificacion_rfp",
    gdb_target_col: "NOMBRE",
    gdb_categoria_col: "CATEGORIA",
    fk_col: "id_zonificacion_rfp",
  },
};

const INDICATOR_CONFIGS = {
  sgs_ind_predio: {
    id_predio_col: "ID_predio",
    csv_name: "sgs_ind_predio.csv",
    cols: {
      microcuenca: "microcuenca",
      num_coberturas: "num_coberturas",
      cobertura_principal: "cobertura_principal",
      bioma_principal: "bioma_principal",
      porc_paramo: "porc_paramo",
      categoria_pomca: "categoria_pomca",
      nombre_rfp: "nombre_rfp",
    },
  },
  sgs_ind_ambiental_predio: {
    id_predio_col: "ID_predio",
    csv_name: "sgs_ind_ambiental.csv",
    cols: {
      area_bosque_ha: "area_bosque_ha",
      area_pastos_ha: "area_pastos_ha",
      area_cultivos_ha: "area_cultivos_ha",
      area_vegetacion_secundaria_ha: "area_vegetacion_secundaria_ha",
      area_mosaico_ha: "area_mosaico_ha",
      area_urbana_ha: "area_urbana_ha",
      area_otros_ha: "area_otros_ha",
      area_bioma_ha: "area_bioma_ha",
      area_paramo_ha: "area_paramo_ha",
      tipo_cobertura_predominante: "tipo_cobertura_predominante",
      tipo_bioma_predominante: "tipo_bioma_predominante",
    },
  },
  sgs_ind_hidrico_predio: {
    id_predio_col: "ID_predio",
    csv_name: "sgs_ind_hidrico.csv",
    cols: {
      long_drenaje_m: "long_drenaje_m",
      distancia_drenaje_m: "distancia_drenaje_m",
      area_ronda_ha: "area_ronda_ha",
      porc_ronda: "porc_ronda",
    },
  },
  sgs_ind_intervencion_predio: {
    id_predio_col: "ID_predio",
    csv_name: "sgs_ind_intervencion.csv",
    cols: {
      num_propuestas_punto: "num_propuestas_punto",
      num_propuestas_linea: "num_propuestas_linea",
      num_propuestas_poligono: "num_propuestas_poligono",
      total_propuestas: "total_propuestas",
      area_intervenida_ha: "area_intervenida_ha",
      longitud_intervenida_m: "longitud_intervenida_m",
      estado_predominante: "estado_predominante",
      componente_predominante: "componente_predominante",
      accion_predominante: "accion_predominante",
    },
  },
  sgs_ind_municipio: {
    use_municipio: true,
    csv_name: "sgs_ind_municipio.csv",
    cols: {
      num_predios: "num_predios",
      area_total_ha: "area_total_ha",
      area_bosque_ha: "area_bosque_ha",
      area_pastos_ha: "area_pastos_ha",
      area_cultivos_ha: "area_cultivos_ha",
      area_paramo_ha: "area_paramo_ha",
      num_predios_paramo: "num_predios_paramo",
      num_intervenciones: "num_intervenciones",
      area_restaurada_ha: "area_restaurada_ha",
      longitud_intervencion_m: "longitud_intervencion_m",
      area_ronda_ha: "area_ronda_ha",
    },
  },
};

// =============================================================================
// CSV parser RFC 4180
// =============================================================================
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQuotes) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && n === '\n') i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map(arr => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (arr[i] ?? "").trim(); });
    return obj;
  });
}

// =============================================================================
// Helpers
// =============================================================================
function toIntArrayLiteral(arr) {
  // null o NaN → null en postgres; necesitamos '' para null en el array
  return "{" + arr.map(v => v === null || v === undefined || Number.isNaN(v) ? "NULL" : String(Math.trunc(v))).join(",") + "}";
}
function toFloatArrayLiteral(arr) {
  return "{" + arr.map(v => v === null || v === undefined || Number.isNaN(v) ? "NULL" : String(v)).join(",") + "}";
}
function toTextArrayLiteral(arr) {
  // Escape backslashes and double-quotes for postgres array literal
  return "{" + arr.map(v => {
    if (v === null || v === undefined) return "NULL";
    const s = String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${s}"`;
  }).join(",") + "}";
}

// =============================================================================
// Junction table import (batch via UNNEST con arrays literales)
// =============================================================================
async function importJunctionTable(tableName) {
  const cfg = JUNCTION_CONFIGS[tableName];
  const csvPath = join(PHASE6_DIR, `${tableName}.csv`);
  if (!existsSync(csvPath)) { console.warn(`  SKIP: ${csvPath}`); return; }

  console.log(`\n[phase6] Junction: ${tableName}`);
  const rows = parseCSV(readFileSync(csvPath, "utf-8"));
  console.log(`  CSV: ${rows.length} rows`);

  // Build lookup cache
  const cache = await sql.unsafe(
    `SELECT ${cfg.fk_col}, ${tableName === "sgs_rel_predio_zonificacion_rfp" ? "nombre, categoria_zonificacion" : cfg.lookup_col} FROM ${cfg.lookup_table}`
  );
  const lookupByName = new Map();
  const lookupByCategoria = new Map();
  for (const r of cache) {
    if (r.nombre) lookupByName.set(String(r.nombre).trim(), r[cfg.fk_col]);
    if (r[cfg.lookup_col]) lookupByName.set(String(r[cfg.lookup_col]).trim(), r[cfg.fk_col]);
    if (r.categoria_zonificacion !== undefined) {
      lookupByCategoria.set(String(r.categoria_zonificacion).trim(), r[cfg.fk_col]);
    }
  }
  console.log(`  Cache: ${cache.length} entries`);

  // Build arrays
  const idPredioArr = [], idTargetArr = [], areaArr = [], pctArr = [];
  let skipped = 0;
  for (const r of rows) {
    const idPredio = parseInt(r[cfg.id_predio_col]);
    if (!idPredio || isNaN(idPredio)) { skipped++; continue; }
    let idTarget = null;
    if (tableName === "sgs_rel_predio_zonificacion_rfp") {
      const nombre = String(r[cfg.gdb_target_col] || "").trim();
      const categoria = String(r[cfg.gdb_categoria_col] || "").trim();
      if (nombre) idTarget = lookupByName.get(nombre);
      if (!idTarget && categoria) idTarget = lookupByCategoria.get(categoria);
    } else {
      const targetKey = String(r[cfg.gdb_target_col] || "").trim();
      if (targetKey) idTarget = lookupByName.get(targetKey);
    }
    if (!idTarget) { skipped++; continue; }
    idPredioArr.push(idPredio);
    idTargetArr.push(idTarget);
    areaArr.push(parseFloat(r.area_interseccion_ha) || null);
    pctArr.push(parseFloat(r.porcentaje_predio) || null);
  }

  if (idPredioArr.length === 0) {
    console.log(`  No valid rows. Skipped: ${skipped}`);
    return;
  }

  // Single batch INSERT
  const ipL = toIntArrayLiteral(idPredioArr);
  const itL = toIntArrayLiteral(idTargetArr);
  const arL = toFloatArrayLiteral(areaArr);
  const pcL = toFloatArrayLiteral(pctArr);

  try {
    const result = await sql.unsafe(
      `INSERT INTO ${tableName} (id_predio, ${cfg.fk_col}, area_interseccion_ha, porcentaje_predio)
       SELECT t.ip, t.it, t.ar::numeric, t.pc::numeric FROM UNNEST(
         $1::int[], $2::int[], $3::float8[], $4::float8[]
       ) AS t(ip, it, ar, pc)
       ON CONFLICT DO NOTHING
       RETURNING id_predio`,
      [ipL, itL, arL, pcL]
    );
    console.log(`  Inserted: ${result.length} (Skipped: ${skipped})`);
  } catch (e) {
    console.error(`  FATAL: ${e.message.slice(0, 300)}`);
    // Fallback: per-row
    let ins = 0;
    for (let i = 0; i < idPredioArr.length; i++) {
      try {
        await sql.unsafe(
          `INSERT INTO ${tableName} (id_predio, ${cfg.fk_col}, area_interseccion_ha, porcentaje_predio)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [idPredioArr[i], idTargetArr[i], areaArr[i], pctArr[i]]
        );
        ins++;
      } catch (e2) { /* FK skip */ }
    }
    console.log(`  Per-row inserted: ${ins} (Skipped: ${skipped})`);
  }
}

// =============================================================================
// Indicator table import (batch via UNNEST multi-arg)
// =============================================================================
async function importIndicatorTable(tableName) {
  const cfg = INDICATOR_CONFIGS[tableName];
  const csvPath = join(PHASE6_DIR, cfg.csv_name || `${tableName}.csv`);
  if (!existsSync(csvPath)) { console.warn(`  SKIP: ${csvPath}`); return; }

  console.log(`\n[phase6] Indicator: ${tableName}`);
  const rows = parseCSV(readFileSync(csvPath, "utf-8"));
  console.log(`  CSV: ${rows.length} rows`);

  let municipioCache = new Map();
  if (cfg.use_municipio) {
    const mun = await sql`SELECT id_municipio, nombre_municipio FROM bcs_lpa_municipio`;
    for (const m of mun) municipioCache.set(String(m.nombre_municipio).trim(), m.id_municipio);
    console.log(`  Municipio cache: ${municipioCache.size}`);
  }

  // Build row objects
  const rowObjs = [];
  let skipped = 0;
  for (const r of rows) {
    const out = {};
    if (cfg.use_municipio) {
      const munName = String(r.municipio || "").trim();
      const id_municipio = municipioCache.get(munName);
      if (!id_municipio) { skipped++; continue; }
      out.id_municipio = id_municipio;
    } else {
      const idPredio = parseInt(r[cfg.id_predio_col]);
      if (!idPredio || isNaN(idPredio)) { skipped++; continue; }
      out.id_predio = idPredio;
    }
    for (const [pgCol, gdbCol] of Object.entries(cfg.cols)) {
      if (gdbCol in r) {
        let v = r[gdbCol];
        if (v === "" || v === undefined) v = null;
        else if (pgCol.match(/_ha$|_m$|_m2$|paramo$|ronda$|cobertura$|restaurada$|coberturas$|propuestas$|intervencion/)) {
          v = parseFloat(v);
          if (isNaN(v)) v = null;
        }
        out[pgCol] = v;
      }
    }
    if (Object.keys(out).length > 0) rowObjs.push(out);
  }

  if (rowObjs.length === 0) {
    console.log(`  No valid rows. Skipped: ${skipped}`);
    return;
  }

  // Determine types and build arrays
  const cols = Object.keys(rowObjs[0]);
  const colTypes = cols.map(c => {
    const v = rowObjs[0][c];
    if (typeof v === "number") return "numeric";
    return "text";
  });

  // Build col → array literal mapping
  const colLiterals = cols.map((c, i) => {
    const arr = rowObjs.map(ro => ro[c]);
    return colTypes[i] === "numeric" ? toFloatArrayLiteral(arr) : toTextArrayLiteral(arr);
  });

  const colListSql = cols.map(c => `"${c}"`).join(", ");
  const unnestPlaceholders = cols.map((_, i) => `$${i+1}::${colTypes[i]}[]`).join(", ");
  const selectList = cols.map((_, i) => `t.col${i + 1}`).join(", ");
  const tColsDef = cols.map((_, i) => `col${i + 1} ${colTypes[i]}`).join(", ");

  try {
    // Use VALUES (...) multi-row, con parameterized $1..$N para cada row
    // Para mantener simple, usamos un INSERT por row con Promise.all (paralelo)
    const promises = rowObjs.map(ro => {
      const c = Object.keys(ro);
      const v = c.map(k => ro[k]);
      const ps = c.map((_, i) => `$${i+1}`).join(", ");
      return sql.unsafe(
        `INSERT INTO ${tableName} (${c.map(k => `"${k}"`).join(", ")}) VALUES (${ps}) ON CONFLICT DO NOTHING`,
        v
      ).then(() => 1).catch(() => 0);
    });
    const results = await Promise.all(promises);
    const inserted = results.reduce((a, b) => a + b, 0);
    console.log(`  Inserted: ${inserted} (Skipped: ${skipped})`);
  } catch (e) {
    console.warn(`  Failed: ${e.message.slice(0, 200)}`);
  }
}

// =============================================================================
// Main
// =============================================================================
async function main() {
  console.log(`[phase6] DB: ${DB_URL.replace(/:[^:@/]+@/, ":***@")}`);
  console.log(`[phase6] Source: ${PHASE6_DIR}`);

  for (const tableName of Object.keys(JUNCTION_CONFIGS)) {
    await importJunctionTable(tableName);
  }
  for (const tableName of Object.keys(INDICATOR_CONFIGS)) {
    await importIndicatorTable(tableName);
  }

  console.log("\n[phase6] Counts finales:");
  const counts = await sql`
    SELECT
      (SELECT count(*)::int FROM sgs_rel_predio_cobertura) AS cobertura,
      (SELECT count(*)::int FROM sgs_rel_predio_bioma) AS bioma,
      (SELECT count(*)::int FROM sgs_rel_predio_paramos) AS paramos,
      (SELECT count(*)::int FROM sgs_rel_predio_zonificacion_pomca) AS pomca,
      (SELECT count(*)::int FROM sgs_rel_predio_zonificacion_rfp) AS rfp,
      (SELECT count(*)::int FROM sgs_ind_predio) AS ind_predio,
      (SELECT count(*)::int FROM sgs_ind_ambiental_predio) AS ind_amb,
      (SELECT count(*)::int FROM sgs_ind_hidrico_predio) AS ind_hid,
      (SELECT count(*)::int FROM sgs_ind_intervencion_predio) AS ind_int,
      (SELECT count(*)::int FROM sgs_ind_municipio) AS ind_mun
  `;
  for (const [k, v] of Object.entries(counts[0])) console.log(`  ${k}: ${v}`);

  await sql.end({ timeout: 5 });
}

main().catch(err => { console.error("[phase6] FATAL:", err.message); process.exit(1); });
