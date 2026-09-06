#!/usr/bin/env node
// =============================================================================
// reimport_propuesta_super.mjs
//
// Re-sintetiza sgs_pro_propuesta (super) desde las 3 hijas con SQL directo.
// 1000x más rápido que el approach per-row de import_propuesta.mjs.
//
// Flujo:
//   1. TRUNCATE sgs_pro_propuesta + 3 hijas (CASCADE)
//   2. Re-importar las 3 hijas desde GDB (solo id_predio, actividad, geom)
//   3. INSERT INTO sgs_pro_propuesta SELECT ... FROM (hijas UNION ALL)
//   4. UPDATE hijas SET id_propuesta = super.id WHERE ...
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
// 1. Limpiar todo
// =============================================================================
console.log("[super] TRUNCATE sgs_pro_propuesta + 3 hijas...");
await sql.unsafe(`TRUNCATE sgs_pro_propuesta, sgs_pro_propuesta_punto, sgs_pro_propuesta_linea, sgs_pro_propuesta_poligono RESTART IDENTITY CASCADE`);

// =============================================================================
// 2. Re-importar las 3 hijas (id_predio + actividad + geom)
// =============================================================================
console.log("\n[super] Re-importando hijas...");

async function importHija(table, file, gdbIdCol, pgIdCol) {
  const features = readGeoJSON(file);
  console.log(`  ${table}: ${features.length} features`);
  let ok = 0, err = 0;
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const id = parseInt(f[gdbIdCol]);
    const id_predio = parseInt(f.id_predio) || null;
    const actividad = String(f.actividad || "").trim() || "";
    const wkt = f.__geometry ? geojsonToWKT(f.__geometry) : null;
    try {
      if (wkt) {
        await sql.unsafe(
          `INSERT INTO ${table} (${pgIdCol}, id_predio, actividad, geom) VALUES ($1, $2, $3, ST_Multi(ST_GeomFromText($4, 4686)))`,
          [id, id_predio, actividad, wkt]
        );
      } else {
        await sql.unsafe(
          `INSERT INTO ${table} (${pgIdCol}, id_predio, actividad) VALUES ($1, $2, $3)`,
          [id, id_predio, actividad]
        );
      }
      ok++;
    } catch (e) {
      if (err < 3) console.warn(`  WARN ${table} ${id}: ${e.message.slice(0, 100)}`);
      err++;
    }
  }
  console.log(`  ${table}: ${ok} OK, ${err} errors`);
}

await importHija("sgs_pro_propuesta_punto",    "sgs_pro_propuesta_punto.geojson",    "id_prop_pu", "id_prop_punto");
await importHija("sgs_pro_propuesta_linea",    "sgs_pro_propuesta_linea.geojson",    "id_pro_lin", "id_prop_linea");
await importHija("sgs_pro_propuesta_poligono", "sgs_pro_propuesta_poligono.geojson", "id_prop_po", "id_prop_poligono");

// =============================================================================
// 3. Sintetizar sgs_pro_propuesta (super) con SQL directo
// =============================================================================
console.log("\n[super] Sintetizando sgs_pro_propuesta con SQL directo...");

// Primero, populate componentes/acciones si no existen
await sql`
  INSERT INTO sgs_com_componente (nombre)
  SELECT DISTINCT c.nombre FROM (
    SELECT componente AS nombre FROM sgs_pro_propuesta_punto WHERE componente IS NOT NULL AND componente <> ''
    UNION SELECT componente FROM sgs_pro_propuesta_linea WHERE componente IS NOT NULL AND componente <> ''
    UNION SELECT componente FROM sgs_pro_propuesta_poligono WHERE componente IS NOT NULL AND componente <> ''
  ) c
  WHERE NOT EXISTS (SELECT 1 FROM sgs_com_componente WHERE nombre = c.nombre)
`;

// Sincronizar id_accion (component + action)
const accionSync = await sql`
  INSERT INTO sgs_com_accion (id_componente, nombre)
  SELECT DISTINCT cc.id_componente, a.accion
  FROM (
    SELECT DISTINCT pp.componente, pp.accion
    FROM sgs_pro_propuesta_punto pp WHERE pp.accion IS NOT NULL AND pp.accion <> ''
    UNION
    SELECT DISTINCT pl.componente, pl.accion
    FROM sgs_pro_propuesta_linea pl WHERE pl.accion IS NOT NULL AND pl.accion <> ''
    UNION
    SELECT DISTINCT pq.componente, pq.accion
    FROM sgs_pro_propuesta_poligono pq WHERE pq.accion IS NOT NULL AND pq.accion <> ''
  ) a
  JOIN sgs_com_componente cc ON cc.nombre = a.componente
  ON CONFLICT (id_componente, nombre) DO NOTHING
`;
console.log(`  Acciones sincronizadas: ${accionSync.count}`);

// Sintetizar la super con un solo INSERT por hija
// Cada row de hija → un row de super con id_predio (o NULL)
console.log("\n[super] Insertando sgs_pro_propuesta desde las 3 hijas...");

await sql`
  INSERT INTO sgs_pro_propuesta (id_predio, id_accion, actividad, tipo, estado)
  SELECT
    pp.id_predio,
    a.id_accion,
    pp.actividad,
    'punto',
    COALESCE(NULLIF(pp.estado, ''), 'Pendiente')
  FROM sgs_pro_propuesta_punto pp
  LEFT JOIN sgs_com_accion a ON a.nombre = pp.accion
  WHERE pp.actividad IS NOT NULL AND pp.actividad <> ''
`;

await sql`
  INSERT INTO sgs_pro_propuesta (id_predio, id_accion, actividad, tipo, estado)
  SELECT
    pl.id_predio,
    a.id_accion,
    pl.actividad,
    'linea',
    COALESCE(NULLIF(pl.estado, ''), 'Pendiente')
  FROM sgs_pro_propuesta_linea pl
  LEFT JOIN sgs_com_accion a ON a.nombre = pl.accion
  WHERE pl.actividad IS NOT NULL AND pl.actividad <> ''
`;

await sql`
  INSERT INTO sgs_pro_propuesta (id_predio, id_accion, actividad, tipo, estado)
  SELECT
    pq.id_predio,
    a.id_accion,
    pq.actividad,
    'poligono',
    COALESCE(NULLIF(pq.estado, ''), 'Pendiente')
  FROM sgs_pro_propuesta_poligono pq
  LEFT JOIN sgs_com_accion a ON a.nombre = pq.accion
  WHERE pq.actividad IS NOT NULL AND pq.actividad <> ''
`;

// Update id_propuesta en las hijas usando la posición
console.log("\n[super] Linking id_propuesta en las hijas...");

// Estrategia: para cada hija, asignar el id_propuesta correcto basado en id_predio + actividad
// Pero como la super fue sintetizada en orden (punto, linea, poligono), el orden de inserción es claro
await sql`
  WITH super_punto AS (
    SELECT id_propuesta, ROW_NUMBER() OVER (ORDER BY id_propuesta) AS rn
    FROM sgs_pro_propuesta WHERE tipo = 'punto'
  ),
  hija_punto AS (
    SELECT id_prop_punto, ROW_NUMBER() OVER (ORDER BY id_prop_punto) AS rn
    FROM sgs_pro_propuesta_punto
  )
  UPDATE sgs_pro_propuesta_punto pp
  SET id_propuesta = sp.id_propuesta
  FROM super_punto sp, hija_punto hp
  WHERE pp.id_prop_punto = hp.id_prop_punto AND hp.rn = sp.rn
`;

await sql`
  WITH super_linea AS (
    SELECT id_propuesta, ROW_NUMBER() OVER (ORDER BY id_propuesta) AS rn
    FROM sgs_pro_propuesta WHERE tipo = 'linea'
  ),
  hija_linea AS (
    SELECT id_prop_linea, ROW_NUMBER() OVER (ORDER BY id_prop_linea) AS rn
    FROM sgs_pro_propuesta_linea
  )
  UPDATE sgs_pro_propuesta_linea pl
  SET id_propuesta = sl.id_propuesta
  FROM super_linea sl, hija_linea hl
  WHERE pl.id_prop_linea = hl.id_prop_linea AND hl.rn = sl.rn
`;

await sql`
  WITH super_poligono AS (
    SELECT id_propuesta, ROW_NUMBER() OVER (ORDER BY id_propuesta) AS rn
    FROM sgs_pro_propuesta WHERE tipo = 'poligono'
  ),
  hija_poligono AS (
    SELECT id_prop_poligono, ROW_NUMBER() OVER (ORDER BY id_prop_poligono) AS rn
    FROM sgs_pro_propuesta_poligono
  )
  UPDATE sgs_pro_propuesta_poligono pq
  SET id_propuesta = sp.id_propuesta
  FROM super_poligono sp, hija_poligono hp
  WHERE pq.id_prop_poligono = hp.id_prop_poligono AND hp.rn = sp.rn
`;

// =============================================================================
// Counts finales
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
    (SELECT count(*)::int FROM sgs_pro_propuesta WHERE id_predio IS NOT NULL) AS super_con_predio
`;
for (const [k, v] of Object.entries(c[0])) console.log(`  ${k}: ${v}`);

await sql.end({ timeout: 5 });
