#!/usr/bin/env node
// =============================================================================
// import_phase6_lookups.mjs
//
// Re-importa las 3 lookup tables Fase 6 con TODOS los features del GDB:
//   - sgs_amb_cobertura_clc      (162 features)
//   - sgs_amb_zonificacion_rfp    (486 features)
//   - sgs_amb_zonificacion_pomca  (245 features)
//
// IMPORTANTE: el OBJECTID del GDB tiene duplicados (es un campo de usuario, no
// un rowid). Usamos el INDEX del feature como PK (i+1) y guardamos el OBJECTID
// original en `objectid_gdb`.
//
// TRUNCATE CASCADE limpia las versiones pre-aggregated de Phase 2.
// Las junction tables Fase 6 están vacías, así que CASCADE no afecta nada.
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

// =============================================================================
// TRUNCATE CASCADE
// =============================================================================
console.log("[phase6-lookups] TRUNCATE 3 lookup tables CASCADE...");
await sql`
  TRUNCATE
    sgs_amb_cobertura_clc,
    sgs_amb_zonificacion_rfp,
    sgs_amb_zonificacion_pomca
  RESTART IDENTITY CASCADE
`;

// =============================================================================
// Cobertura CLC (162 features)
// =============================================================================
console.log("\n[phase6-lookups] sgs_amb_cobertura_clc");
const cob = JSON.parse(readFileSync(join(PHASE6_4686, "sgs_amb_cobertura_clc.geojson"), "utf-8"));
console.log(`  Source: ${cob.features.length} features`);
let cobOK = 0, cobErr = 0;
const cobPromises = cob.features.map((f, i) => {
  const p = f.properties;
  const id_cobertura = i + 1;  // PK: index (OBJECTID tiene duplicados)
  const objectid_gdb = parseInt(p.OBJECTID);
  const nombre_cobertura = String(p.nombre || "").trim();
  const codigo_clc_nivel3 = nombre_cobertura.split(",")[0]?.trim() || null;
  const municipio_predio = String(p.MUNICIPIO || "").trim() || null;
  const area_ha = parseFloat(p.area_ha) || null;
  const area_m2 = parseFloat(p.AREA) || null;
  const estado_naturalidad = String(p.naturalida || "").trim() || "Sin info";
  const wkt = f.geometry ? geojsonToWkt(f.geometry) : null;
  return sql`
    INSERT INTO sgs_amb_cobertura_clc
      (id_cobertura, codigo_clc_nivel3, nombre_cobertura, area_ha, area_m2,
       estado_naturalidad, año_interpretacion, label, municipio_predio, objectid_gdb, geom)
    VALUES (${id_cobertura}, ${codigo_clc_nivel3}, ${nombre_cobertura}, ${area_ha}, ${area_m2},
            ${estado_naturalidad}, ${2024}, ${nombre_cobertura}, ${municipio_predio}, ${objectid_gdb},
            ${wkt ? sql`ST_Multi(ST_GeomFromText(${wkt}, 4686))` : null})
    ON CONFLICT (id_cobertura) DO NOTHING
  `.then(() => { cobOK++; }).catch(e => {
    if (cobErr < 3) console.warn(`  WARN cobertura ${id_cobertura}: ${e.message}`);
    cobErr++;
  });
});
await Promise.all(cobPromises);
console.log(`  Inserted: ${cobOK}, Errors: ${cobErr}`);

// =============================================================================
// RFP (zonificacion, 486 features)
// =============================================================================
console.log("\n[phase6-lookups] sgs_amb_zonificacion_rfp");
const rfp = JSON.parse(readFileSync(join(PHASE6_4686, "sgs_amb_zonificacion_rfp.geojson"), "utf-8"));
console.log(`  Source: ${rfp.features.length} features`);
let rfpOK = 0, rfpErr = 0;
const rfpPromises = rfp.features.map((f, i) => {
  const p = f.properties;
  const id_zonificacion_rfp = i + 1;
  const objectid_gdb = parseInt(p.OBJECTID);
  const categoria_zonificacion = String(p.CATEGORIA || "").trim() || " ";
  const nombre = String(p.NOMBRE || "").trim() || null;
  const sub_zonificacion = String(p.SUB_ZONIFI || "").trim() || null;
  const area_ha = parseFloat(p.area_ha) || null;
  const wkt = f.geometry ? geojsonToWkt(f.geometry) : null;
  return sql`
    INSERT INTO sgs_amb_zonificacion_rfp
      (id_zonificacion_rfp, categoria_zonificacion, area_ha, nombre, sub_zonificacion, objectid_gdb, geom)
    VALUES (${id_zonificacion_rfp}, ${categoria_zonificacion}, ${area_ha}, ${nombre}, ${sub_zonificacion}, ${objectid_gdb},
            ${wkt ? sql`ST_Multi(ST_GeomFromText(${wkt}, 4686))` : null})
    ON CONFLICT (id_zonificacion_rfp) DO NOTHING
  `.then(() => { rfpOK++; }).catch(e => {
    if (rfpErr < 3) console.warn(`  WARN rfp ${id_zonificacion_rfp}: ${e.message}`);
    rfpErr++;
  });
});
await Promise.all(rfpPromises);
console.log(`  Inserted: ${rfpOK}, Errors: ${rfpErr}`);

// =============================================================================
// POMCA (245 features)
// =============================================================================
console.log("\n[phase6-lookups] sgs_amb_zonificacion_pomca");
const pom = JSON.parse(readFileSync(join(PHASE6_4686, "sgs_amb_zonificacion_pomca.geojson"), "utf-8"));
console.log(`  Source: ${pom.features.length} features`);
let pomOK = 0, pomErr = 0;
const pomPromises = pom.features.map((f, i) => {
  const p = f.properties;
  const id_zonificacion_pomca = i + 1;
  const objectid_gdb = parseInt(p.OBJECTID);
  const categoria_zonificacion = String(p.CAT_ORD || "").trim() || " ";
  const codigo = String(p.CODIGO || "").trim() || null;
  const nomenclatura = String(p.NOMENCLAT || "").trim() || null;
  const descripcion = String(p.DESCRIP || "").trim() || null;
  const area_ha = parseFloat(p.AREA_ha) || null;
  const wkt = f.geometry ? geojsonToWkt(f.geometry) : null;
  return sql`
    INSERT INTO sgs_amb_zonificacion_pomca
      (id_zonificacion_pomca, categoria_zonificacion, area_ha, codigo, nomenclatura, descripcion, objectid_gdb, geom)
    VALUES (${id_zonificacion_pomca}, ${categoria_zonificacion}, ${area_ha}, ${codigo}, ${nomenclatura}, ${descripcion}, ${objectid_gdb},
            ${wkt ? sql`ST_Multi(ST_GeomFromText(${wkt}, 4686))` : null})
    ON CONFLICT (id_zonificacion_pomca) DO NOTHING
  `.then(() => { pomOK++; }).catch(e => {
    if (pomErr < 3) console.warn(`  WARN pomca ${id_zonificacion_pomca}: ${e.message}`);
    pomErr++;
  });
});
await Promise.all(pomPromises);
console.log(`  Inserted: ${pomOK}, Errors: ${pomErr}`);

// =============================================================================
// Counts finales
// =============================================================================
console.log("\n[phase6-lookups] Counts finales:");
const c = await sql`
  SELECT
    (SELECT count(*)::int FROM sgs_amb_cobertura_clc) AS cobertura,
    (SELECT count(*)::int FROM sgs_amb_zonificacion_rfp) AS rfp,
    (SELECT count(*)::int FROM sgs_amb_zonificacion_pomca) AS pomca
`;
for (const [k, v] of Object.entries(c[0])) console.log(`  ${k}: ${v}`);

await sql.end({ timeout: 5 });

// =============================================================================
// Helpers
// =============================================================================
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
