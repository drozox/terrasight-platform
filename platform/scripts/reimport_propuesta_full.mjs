#!/usr/bin/env node
// =============================================================================
// reimport_propuesta_full.mjs
//
// Re-importa las 3 hijas + sintetiza sgs_pro_propuesta (super) en una sola
// pasada. Lee componente/accion del GDB (no de PG) y sintetiza con UNNEST.
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
  return fc.features.map(f => ({ ...f.properties, __geometry: f.geometry }));
}

function geojsonToWKT(geom) {
  if (!geom) return null;
  const t = geom.type, c = geom.coordinates;
  const pair = p => `${p[0]} ${p[1]}`;
  const ring = r => `(${r.map(pair).join(", ")})`;
  switch (t) {
    case "Point": return `POINT(${pair(c)})`;
    case "MultiPoint": return `MULTIPOINT(${c.map(pair).join(", ")})`;
    case "LineString": return `LINESTRING(${c.map(pair).join(", ")})`;
    case "MultiLineString": return `MULTILINESTRING(${c.map(ring).join(", ")})`;
    case "Polygon": return `POLYGON(${c.map(ring).join(", ")})`;
    case "MultiPolygon": return `MULTIPOLYGON(${c.map(p => `(${p.map(ring).join(", ")})`).join(", ")})`;
    default: return null;
  }
}

// =============================================================================
// 1. TRUNCATE TODO
// =============================================================================
console.log("[full] TRUNCATE sgs_pro_propuesta + 3 hijas...");
await sql.unsafe(`TRUNCATE sgs_pro_propuesta, sgs_pro_propuesta_punto, sgs_pro_propuesta_linea, sgs_pro_propuesta_poligono RESTART IDENTITY CASCADE`);

// =============================================================================
// 2. Cargar GDB
// =============================================================================
const puntoGdb = readGeoJSON("sgs_pro_propuesta_punto.geojson");
const lineaGdb = readGeoJSON("sgs_pro_propuesta_linea.geojson");
const poligonoGdb = readGeoJSON("sgs_pro_propuesta_poligono.geojson");
console.log(`[full] GDB cargado: punto=${puntoGdb.length} linea=${lineaGdb.length} poligono=${poligonoGdb.length}`);

// =============================================================================
// 3. Sincronizar componentes y acciones
// =============================================================================
console.log("\n[full] Sincronizando componentes/acciones...");

const compSet = new Set();
const accSet = new Set();
for (const r of [...puntoGdb, ...lineaGdb, ...poligonoGdb]) {
  const c = String(r.componente || "").trim();
  const a = String(r.accion || "").trim();
  if (c) {
    compSet.add(c);
    accSet.add(c + "|" + (a || "Sin clasificar"));
  }
}
for (const c of compSet) {
  await sql`INSERT INTO sgs_com_componente (nombre) VALUES (${c}) ON CONFLICT (nombre) DO NOTHING`;
}
for (const k of accSet) {
  const [c, a] = k.split("|");
  await sql`
    INSERT INTO sgs_com_accion (id_componente, nombre)
    SELECT id_componente, ${a} FROM sgs_com_componente WHERE nombre = ${c}
    ON CONFLICT (id_componente, nombre) DO NOTHING
  `;
}
console.log(`  Componentes: ${compSet.size}, Acciones: ${accSet.size}`);

// Cache de acciones
const accCache = new Map();
const accRows = await sql`SELECT a.id_accion, c.nombre AS comp, a.nombre AS acc FROM sgs_com_accion a JOIN sgs_com_componente c ON c.id_componente = a.id_componente`;
for (const r of accRows) accCache.set(`${r.comp}|${r.acc}`, r.id_accion);

// =============================================================================
// 4. Re-importar las 3 hijas (con orden determinístico: por id_prop_*)
// =============================================================================
console.log("\n[full] Re-importando hijas con orden determinístico...");

async function importHija(table, file, gdbArr, pgIdCol) {
  // Ordenar por id_prop_pu/etc. para tener un orden estable
  const sorted = [...gdbArr].sort((a, b) => {
    const aId = parseInt(a[gdbArr === puntoGdb ? "id_prop_pu" : gdbArr === lineaGdb ? "id_pro_lin" : "id_prop_po"]) || 0;
    const bId = parseInt(b[gdbArr === puntoGdb ? "id_prop_pu" : gdbArr === lineaGdb ? "id_pro_lin" : "id_prop_po"]) || 0;
    return aId - bId;
  });
  let ok = 0, err = 0;
  for (const f of sorted) {
    const id_predio = parseInt(f.id_predio) || null;
    const actividad = String(f.actividad || "").trim() || "";
    const wkt = f.__geometry ? geojsonToWKT(f.__geometry) : null;
    try {
      if (wkt) {
        await sql.unsafe(
          `INSERT INTO ${table} (${pgIdCol}, id_predio, actividad, geom) VALUES (DEFAULT, $1, $2, ST_Multi(ST_GeomFromText($3, 4686)))`,
          [id_predio, actividad, wkt]
        );
      } else {
        await sql.unsafe(
          `INSERT INTO ${table} (${pgIdCol}, id_predio, actividad) VALUES (DEFAULT, $1, $2)`,
          [id_predio, actividad]
        );
      }
      ok++;
    } catch (e) {
      if (err < 3) console.warn(`  WARN ${table}: ${e.message.slice(0, 100)}`);
      err++;
    }
  }
  return { ok, err, total: sorted.length };
}

const r1 = await importHija("sgs_pro_propuesta_punto",    "sgs_pro_propuesta_punto.geojson",    puntoGdb,    "id_prop_punto");
const r2 = await importHija("sgs_pro_propuesta_linea",    "sgs_pro_propuesta_linea.geojson",    lineaGdb,    "id_prop_linea");
const r3 = await importHija("sgs_pro_propuesta_poligono", "sgs_pro_propuesta_poligono.geojson", poligonoGdb, "id_prop_poligono");
console.log(`  Punto: ${r1.ok}/${r1.total} OK, Linea: ${r2.ok}/${r2.total} OK, Poligono: ${r3.ok}/${r3.total} OK`);

// =============================================================================
// 5. Sintetizar sgs_pro_propuesta con UNNEST (componente/accion del GDB)
// =============================================================================
console.log("\n[full] Sintetizando super con UNNEST...");

function buildSuperRows(gdbArr, tipo) {
  return gdbArr
    .map(g => {
      const id_predio = parseInt(g.id_predio) || null;
      const actividad = String(g.actividad || "").trim();
      if (!actividad) return null;
      const componente = String(g.componente || "").trim();
      const accion = String(g.accion || "").trim();
      const idAccion = accCache.get(`${componente}|${accion || "Sin clasificar"}`) || null;
      return { id_predio, id_accion: idAccion, actividad, tipo, estado: "Pendiente" };
    })
    .filter(r => r !== null);
}

const allSuperRows = [
  ...buildSuperRows(puntoGdb, "punto"),
  ...buildSuperRows(lineaGdb, "linea"),
  ...buildSuperRows(poligonoGdb, "poligono"),
];
console.log(`  Total super rows: ${allSuperRows.length}`);

const BATCH = 200;
let inserted = 0;
for (let off = 0; off < allSuperRows.length; off += BATCH) {
  const batch = allSuperRows.slice(off, off + BATCH);
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
// 6. Link id_propuesta en las hijas usando CTID
// =============================================================================
console.log("\n[full] Linking id_propuesta en las hijas...");

await sql`
  WITH super_p AS (
    SELECT id_propuesta, ROW_NUMBER() OVER (ORDER BY id_propuesta) AS rn
    FROM sgs_pro_propuesta WHERE tipo = 'punto'
  ),
  hija_p AS (
    SELECT ctid, ROW_NUMBER() OVER (ORDER BY ctid) AS rn FROM sgs_pro_propuesta_punto
  )
  UPDATE sgs_pro_propuesta_punto pp
  SET id_propuesta = sp.id_propuesta
  FROM super_p sp, hija_p hp
  WHERE pp.ctid = hp.ctid AND hp.rn = sp.rn
`;
await sql`
  WITH super_l AS (
    SELECT id_propuesta, ROW_NUMBER() OVER (ORDER BY id_propuesta) AS rn
    FROM sgs_pro_propuesta WHERE tipo = 'linea'
  ),
  hija_l AS (
    SELECT ctid, ROW_NUMBER() OVER (ORDER BY ctid) AS rn FROM sgs_pro_propuesta_linea
  )
  UPDATE sgs_pro_propuesta_linea pl
  SET id_propuesta = sl.id_propuesta
  FROM super_l sl, hija_l hl
  WHERE pl.ctid = hl.ctid AND hl.rn = sl.rn
`;
await sql`
  WITH super_q AS (
    SELECT id_propuesta, ROW_NUMBER() OVER (ORDER BY id_propuesta) AS rn
    FROM sgs_pro_propuesta WHERE tipo = 'poligono'
  ),
  hija_q AS (
    SELECT ctid, ROW_NUMBER() OVER (ORDER BY ctid) AS rn FROM sgs_pro_propuesta_poligono
  )
  UPDATE sgs_pro_propuesta_poligono pq
  SET id_propuesta = sq.id_propuesta
  FROM super_q sq, hija_q hq
  WHERE pq.ctid = hq.ctid AND hq.rn = sq.rn
`;

// =============================================================================
// 7. Counts finales
// =============================================================================
console.log("\n[full] Counts finales:");
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
