#!/usr/bin/env node
// =============================================================================
// import_drenaje_quebrada.mjs
//
// Importa:
//   - sgs_inf_drenaje_doble (7 features del GDB, polígonos)
//   - bcs_dh_quebrada (derivado de sgs_inf_drenaje_simple: filtra por
//     NOMBRE_GEO no vacío, 656 features, MultiLineString)
//
// Source: C:\dev\scratch\gdb_export\phase6_4686\ (EPSG:4686 GeoJSON)
// =============================================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const PHASE6_4686 = process.env.PHASE6_4686 || "C:\\dev\\scratch\\gdb_export\\phase6_4686";
const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("Falta DATABASE_URL"); process.exit(1); }
const sql = postgres(DB_URL, { max: 8, onnotice: () => {} });

function geojsonToWkt(g) {
  const coords = g.coordinates;
  const t = g.type;
  if (t === "Polygon") return "POLYGON(" + coords.map(ring => "(" + ring.map(pt => pt[0] + " " + pt[1]).join(", ") + ")").join(", ") + ")";
  if (t === "MultiPolygon") return "MULTIPOLYGON(" + coords.map(poly => "(" + poly.map(ring => "(" + ring.map(pt => pt[0] + " " + pt[1]).join(", ") + ")").join(", ") + ")").join(", ") + ")";
  if (t === "LineString") return "LINESTRING(" + coords.map(pt => pt[0] + " " + pt[1]).join(", ") + ")";
  if (t === "MultiLineString") return "MULTILINESTRING(" + coords.map(line => "(" + line.map(pt => pt[0] + " " + pt[1]).join(", ") + ")").join(", ") + ")";
  if (t === "Point") return "POINT(" + coords[0] + " " + coords[1] + ")";
  return null;
}

// =============================================================================
// sgs_inf_drenaje_doble (7 features, MultiPolygon)
// =============================================================================
console.log("[drenaje-quebrada] TRUNCATE sgs_inf_drenaje_doble + bcs_dh_quebrada...");
await sql`TRUNCATE sgs_inf_drenaje_doble, bcs_dh_quebrada RESTART IDENTITY CASCADE`;

console.log("\n[drenaje-quebrada] sgs_inf_drenaje_doble");
const dbl = JSON.parse(readFileSync(join(PHASE6_4686, "sgs_inf_drenaje_doble.geojson"), "utf-8"));
console.log(`  Source: ${dbl.features.length} features`);
let dblOK = 0, dblErr = 0;
const dblPromises = dbl.features.map((f, i) => {
  const p = f.properties;
  const id_drenaje_doble = i + 1;
  const nombre_geografico = String(p.NOMBRE_GEO || "").trim() || "Sin nombre";
  const tipo = "Doble";
  const wkt = f.geometry ? geojsonToWkt(f.geometry) : null;
  return sql`
    INSERT INTO sgs_inf_drenaje_doble (id_drenaje_doble, tipo, nombre_geografico, geom)
    VALUES (${id_drenaje_doble}, ${tipo}, ${nombre_geografico},
            ${wkt ? sql`ST_Multi(ST_GeomFromText(${wkt}, 4686))` : null})
    ON CONFLICT (id_drenaje_doble) DO NOTHING
  `.then(() => { dblOK++; }).catch(e => {
    if (dblErr < 3) console.warn(`  WARN ${id_drenaje_doble}: ${e.message.slice(0, 100)}`);
    dblErr++;
  });
});
await Promise.all(dblPromises);
console.log(`  Inserted: ${dblOK}, Errors: ${dblErr}`);

// =============================================================================
// bcs_dh_quebrada (derivado de sgs_inf_drenaje_simple)
// =============================================================================
console.log("\n[drenaje-quebrada] bcs_dh_quebrada (from sgs_inf_drenaje_simple)");
const simple = JSON.parse(readFileSync(join(PHASE6_4686, "sgs_inf_drenaje_simple.geojson"), "utf-8"));
const named = simple.features.filter(f => (f.properties.NOMBRE_GEO || "").trim().length > 0);
console.log(`  Source: ${simple.features.length} total, ${named.length} con NOMBRE_GEO no vacío`);

// Build rows
const rows = named.map((f, i) => {
  const p = f.properties;
  return {
    id_quebrada: i + 1,
    nombre_quebrada: String(p.NOMBRE_GEO || "").trim(),
    longitud: parseFloat(p.Shape_Leng) || null,
    wkt: f.geometry ? geojsonToWkt(f.geometry) : null,
  };
});

// Parallel with concurrency limit
const CONCURRENCY = 6;
let qOK = 0, qErr = 0;
async function processBatch(batch) {
  const promises = batch.map(r => {
    if (!r.wkt) {
      return sql`
        INSERT INTO bcs_dh_quebrada (id_quebrada, nombre_quebrada, longitud, nombre_usuarios)
        VALUES (${r.id_quebrada}, ${r.nombre_quebrada}, ${r.longitud}, ${""})
        ON CONFLICT (id_quebrada) DO NOTHING
      `.then(() => { qOK++; }).catch(e => {
        if (qErr < 3) console.warn(`  WARN ${r.id_quebrada}: ${e.message.slice(0, 100)}`);
        qErr++;
      });
    }
    return sql`
      INSERT INTO bcs_dh_quebrada (id_quebrada, nombre_quebrada, longitud, nombre_usuarios, geom)
      VALUES (${r.id_quebrada}, ${r.nombre_quebrada}, ${r.longitud}, ${""},
              ST_Multi(ST_GeomFromText(${r.wkt}, 4686)))
      ON CONFLICT (id_quebrada) DO NOTHING
    `.then(() => { qOK++; }).catch(e => {
      if (qErr < 3) console.warn(`  WARN ${r.id_quebrada} (${r.nombre_quebrada}): ${e.message.slice(0, 100)}`);
      qErr++;
    });
  });
  return Promise.all(promises);
}
for (let off = 0; off < rows.length; off += CONCURRENCY) {
  await processBatch(rows.slice(off, off + CONCURRENCY));
}
console.log(`  Inserted: ${qOK}, Errors: ${qErr}`);

// =============================================================================
// Counts finales
// =============================================================================
console.log("\n[drenaje-quebrada] Counts finales:");
const c = await sql`
  SELECT
    (SELECT count(*)::int FROM sgs_inf_drenaje_doble) AS doble,
    (SELECT count(*)::int FROM bcs_dh_quebrada) AS quebrada
`;
for (const [k, v] of Object.entries(c[0])) console.log(`  ${k}: ${v}`);

await sql.end({ timeout: 5 });
