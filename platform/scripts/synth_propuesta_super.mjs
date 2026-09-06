#!/usr/bin/env node
// =============================================================================
// synth_propuesta_super.mjs
//
// Sintetiza sgs_pro_propuesta (super-tipo) desde las 3 hijas + GDB files.
// SQL directo (1000x más rápido que per-row de import_propuesta.mjs).
//
// Lee componente/accion del GDB (no de PG) y los vincula via sgs_com_accion.
// =============================================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const EXPORT_DIR = process.env.GDB_EXPORT_DIR || "C:\\dev\\scratch\\gdb_export";
const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("Falta DATABASE_URL"); process.exit(1); }
const sql = postgres(DB_URL, { max: 4, onnotice: () => {} });

function readGeoJSON(name) {
  const fc = JSON.parse(readFileSync(join(EXPORT_DIR, name), "utf-8"));
  return fc.features.map(f => f.properties);
}

console.log("[super] TRUNCATE sgs_pro_propuesta...");
await sql.unsafe(`TRUNCATE sgs_pro_propuesta RESTART IDENTITY CASCADE`);

// =============================================================================
// 1. Sincronizar componentes y acciones desde las 3 hijas (GDB)
// =============================================================================
console.log("\n[super] Sincronizando sgs_com_componente + sgs_com_accion...");

const punto = readGeoJSON("sgs_pro_propuesta_punto.geojson");
const linea = readGeoJSON("sgs_pro_propuesta_linea.geojson");
const poligono = readGeoJSON("sgs_pro_propuesta_poligono.geojson");
console.log(`  Source: punto=${punto.length} linea=${linea.length} poligono=${poligono.length}`);

// Componentes únicos (no vacíos)
const compSet = new Set();
for (const r of [...punto, ...linea, ...poligono]) {
  const c = String(r.componente || "").trim();
  if (c) compSet.add(c);
}
for (const c of compSet) {
  await sql`INSERT INTO sgs_com_componente (nombre) VALUES (${c}) ON CONFLICT (nombre) DO NOTHING`;
}
console.log(`  Componentes insertados: ${compSet.size}`);

// Acciones únicas con su componente
const accSet = new Set();
for (const r of [...punto, ...linea, ...poligono]) {
  const c = String(r.componente || "").trim();
  const a = String(r.accion || "").trim();
  if (c) accSet.add(c + "|" + a);  // dedupe by (componente, accion)
}
let accInserted = 0;
for (const k of accSet) {
  const [c, a] = k.split("|");
  const r = await sql`
    INSERT INTO sgs_com_accion (id_componente, nombre)
    SELECT id_componente, ${a || "Sin clasificar"} FROM sgs_com_componente WHERE nombre = ${c}
    ON CONFLICT (id_componente, nombre) DO NOTHING
    RETURNING id_accion
  `;
  if (r.length > 0) accInserted++;
}
console.log(`  Acciones nuevas: ${accInserted}`);

// =============================================================================
// 2. Sintetizar sgs_pro_propuesta (super) usando SQL directo
//    Join hijas con GDB para traer componente+accion
// =============================================================================
console.log("\n[super] Sintetizando super con SQL directo...");

// Indexar el GDB por id (el GDB tiene id_prop_pu=0 para todos, pero id_predio+actividad puede diferenciar)
// Vamos a usar la posición en el orden de inserción (mismo orden de filas)

// Estrategia: hacer el INSERT en batches, leyendo el GDB
// Como las hijas ya están importadas en PG, podemos hacer un loop que lea el GDB
// y haga INSERT con la PK de la super

// Helper: leer hija + datos del GDB en orden
function buildRows(gdbFeatures, hijaTable) {
  return gdbFeatures.map((g, idx) => {
    const id_predio = parseInt(g.id_predio) || null;
    const actividad = String(g.actividad || "").trim() || null;
    const componente = String(g.componente || "").trim() || null;
    const accion = String(g.accion || "").trim() || null;
    return { gdbIdx: idx, id_predio, actividad, componente, accion };
  });
}

// Cache de acciones por (componente, accion)
console.log("  Loading accion cache...");
const accCache = new Map();
const accRows = await sql`SELECT a.id_accion, c.nombre AS comp, a.nombre AS acc FROM sgs_com_accion a JOIN sgs_com_componente c ON c.id_componente = a.id_componente`;
for (const r of accRows) accCache.set(`${r.comp}|${r.acc}`, r.id_accion);
console.log(`  Accion cache: ${accCache.size}`);

// Construir todas las filas de la super
function allRows(gdbArr, tipo) {
  return buildRows(gdbArr).map(g => {
    const idAccion = accCache.get(`${g.componente || "Sin clasificar"}|${g.accion || "Sin clasificar"}`) || null;
    return {
      id_predio: g.id_predio,
      id_accion: idAccion,
      actividad: g.actividad,
      tipo,
      estado: "Pendiente",
    };
  });
}

const superRows = [
  ...allRows(punto, "punto"),
  ...allRows(linea, "linea"),
  ...allRows(poligono, "poligono"),
];
console.log(`  Total super rows: ${superRows.length}`);

// Insert en batches
const BATCH = 200;
let inserted = 0;
for (let off = 0; off < superRows.length; off += BATCH) {
  const batch = superRows.slice(off, off + BATCH);
  const ids = batch.map(r => r.id_predio);
  const accs = batch.map(r => r.id_accion);
  const acts = batch.map(r => r.actividad);
  const tipos = batch.map(r => r.tipo);
  const ests = batch.map(r => r.estado);
  try {
    await sql`
      INSERT INTO sgs_pro_propuesta (id_predio, id_accion, actividad, tipo, estado)
      SELECT * FROM UNNEST(
        ${sql.array(ids)}::int[],
        ${sql.array(accs)}::int[],
        ${sql.array(acts)}::text[],
        ${sql.array(tipos)}::text[],
        ${sql.array(ests)}::text[]
      ) AS t(id_predio, id_accion, actividad, tipo, estado)
    `;
    inserted += batch.length;
  } catch (e) {
    console.warn(`  WARN batch ${off}: ${e.message.slice(0, 200)}`);
  }
}
console.log(`  Inserted: ${inserted}`);

// =============================================================================
// 3. Link id_propuesta en las hijas (orden de inserción)
// =============================================================================
console.log("\n[super] Linking id_propuesta en las hijas...");

await sql`
  WITH super_p AS (
    SELECT id_propuesta, ROW_NUMBER() OVER (ORDER BY id_propuesta) AS rn
    FROM sgs_pro_propuesta WHERE tipo = 'punto'
  )
  UPDATE sgs_pro_propuesta_punto pp
  SET id_propuesta = sp.id_propuesta
  FROM super_p sp
  WHERE pp.id_propuesta IS NULL
    AND sp.rn BETWEEN 1 AND (SELECT count(*)::int FROM sgs_pro_propuesta_punto)
    AND sp.rn = (SELECT count(*)::int FROM sgs_pro_propuesta_punto pp2 WHERE pp2.ctid <= pp.ctid)
`;
console.log("  Punto linked (CTID-based)");

await sql`
  WITH super_l AS (
    SELECT id_propuesta, ROW_NUMBER() OVER (ORDER BY id_propuesta) AS rn
    FROM sgs_pro_propuesta WHERE tipo = 'linea'
  )
  UPDATE sgs_pro_propuesta_linea pl
  SET id_propuesta = sl.id_propuesta
  FROM super_l sl
  WHERE pl.id_propuesta IS NULL
    AND sl.rn = (SELECT count(*)::int FROM sgs_pro_propuesta_linea pl2 WHERE pl2.ctid <= pl.ctid)
`;
console.log("  Linea linked");

await sql`
  WITH super_q AS (
    SELECT id_propuesta, ROW_NUMBER() OVER (ORDER BY id_propuesta) AS rn
    FROM sgs_pro_propuesta WHERE tipo = 'poligono'
  )
  UPDATE sgs_pro_propuesta_poligono pq
  SET id_propuesta = sq.id_propuesta
  FROM super_q sq
  WHERE pq.id_propuesta IS NULL
    AND sq.rn = (SELECT count(*)::int FROM sgs_pro_propuesta_poligono pq2 WHERE pq2.ctid <= pq.ctid)
`;
console.log("  Poligono linked");

// =============================================================================
// 4. Counts finales
// =============================================================================
console.log("\n[super] Counts finales:");
const c = await sql`
  SELECT
    (SELECT count(*)::int FROM sgs_pro_propuesta) AS super,
    (SELECT count(*)::int FROM sgs_pro_propuesta_punto) AS punto,
    (SELECT count(*)::int FROM sgs_pro_propuesta_linea) AS linea,
    (SELECT count(*)::int FROM sgs_pro_propuesta_poligono) AS poligono,
    (SELECT count(*)::int FROM sgs_pro_propuesta_punto WHERE id_propuesta IS NOT NULL) AS punto_linked,
    (SELECT count(*)::int FROM sgs_pro_propuesta_linea WHERE id_propuesta IS NOT NULL) AS linea_linked,
    (SELECT count(*)::int FROM sgs_pro_propuesta_poligono WHERE id_propuesta IS NOT NULL) AS poligono_linked,
    (SELECT count(*)::int FROM sgs_pro_propuesta WHERE id_predio IS NOT NULL) AS super_con_predio,
    (SELECT count(*)::int FROM sgs_pro_propuesta WHERE id_accion IS NOT NULL) AS super_con_accion
`;
for (const [k, v] of Object.entries(c[0])) console.log(`  ${k}: ${v}`);

await sql.end({ timeout: 5 });
