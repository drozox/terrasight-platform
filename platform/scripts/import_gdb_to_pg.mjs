// =============================================================================
// import_gdb_to_pg.mjs — Importa los archivos de la GDB (exportados por
// extract_gdb.py a C:\dev\scratch\gdb_export) al schema de Supabase.
//
// Características:
//   - Lee mapping declarativo de scripts/gdb_to_pg_mapping.json
//   - Para cada tabla:
//     * 'simple'   : lee .shp/.csv → mapea columnas → INSERT con FK lookups
//     * 'junction' : lee .csv → solo INSERT FK pairs
//     * 'derived'  : computa valores únicos desde otras capas → INSERT
//     * 'synthesize': agrupa valores únicos de otra capa → INSERT
//   - Convierte GeoJSON geometry a WKT para ST_GeomFromText
//   - Reset de sequences al final (max(id)+1 por tabla SERIAL/BIGSERIAL)
//   - --dry-run: lee todo, muestra counts, NO escribe en PG
//
// Uso:
//   $env:DATABASE_URL = "postgresql://..."
//   node scripts/import_gdb_to_pg.mjs              # ejecuta el import
//   node scripts/import_gdb_to_pg.mjs --dry-run   # solo verifica
//   node scripts/import_gdb_to_pg.mjs --only bcs_lpa_municipio,sgs_pre_predio
// =============================================================================

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
// Leemos GeoJSON (UTF-8 nativo, sin truncar cols) generado por extract_gdb.py.
// shpjs v4 no soporta file:// paths en Node, así que evitamos el Shapefile.

const EXPORT_DIR = process.env.GDB_EXPORT_DIR || "C:\\dev\\scratch\\gdb_export";
const MAPPING_FILE = "scripts/gdb_to_pg_mapping.json";
const DB_URL = process.env.DATABASE_URL;
const MAPPING_CONFIG = JSON.parse(readFileSync(MAPPING_FILE, "utf-8"));

if (!DB_URL) {
  console.error("[import] Falta DATABASE_URL en el env");
  process.exit(1);
}

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes("--dry-run");
const ONLY = ARGS.find(a => a.startsWith("--only="))?.slice("--only=".length).split(",");

console.log(`[import] GDB_EXPORT_DIR: ${EXPORT_DIR}`);
console.log(`[import] DATABASE_URL:   ${DB_URL.replace(/:[^:@/]+@/, ":***@")}`);
console.log(`[import] DRY_RUN:        ${DRY_RUN}`);
if (ONLY) console.log(`[import] ONLY:           ${ONLY.join(", ")}`);
console.log();

const sql = postgres(DB_URL, { max: 4, onnotice: () => {} });

// ------------------------------------------------------------------
// CSV parsing (mínimo — los CSVs de la GDB no tienen quoted fields)
// ------------------------------------------------------------------
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(",");
    const row = {};
    headers.forEach((h, i) => row[h] = (values[i] ?? "").trim());
    return row;
  });
}

// ------------------------------------------------------------------
// GeoJSON → WKT (solo lo que necesitamos: Point / MultiPoint /
// LineString / MultiLineString / Polygon / MultiPolygon)
// ------------------------------------------------------------------
function coordPair(p) { return `${p[0]} ${p[1]}`; }
function ringToWKT(ring) { return `(${ring.map(coordPair).join(", ")})`; }

function geojsonToWKT(geom) {
  if (!geom) return null;
  const t = geom.type;
  const c = geom.coordinates;
  switch (t) {
    case "Point":
      return `POINT(${coordPair(c)})`;
    case "MultiPoint":
      return `MULTIPOINT(${c.map(coordPair).join(", ")})`;
    case "LineString":
      return `LINESTRING(${c.map(coordPair).join(", ")})`;
    case "MultiLineString":
      return `MULTILINESTRING(${c.map(ringToWKT).join(", ")})`;
    case "Polygon":
      return `POLYGON(${c.map(ringToWKT).join(", ")})`;
    case "MultiPolygon":
      return `MULTIPOLYGON(${c.map(poly => `(${poly.map(ringToWKT).join(", ")})`).join(", ")})`;
    default:
      throw new Error(`Geometry type no soportado: ${t}`);
  }
}

// ------------------------------------------------------------------
// File readers
// ------------------------------------------------------------------
async function readRows(filePath) {
  if (filePath.endsWith(".geojson") || filePath.endsWith(".json")) {
    const fc = JSON.parse(readFileSync(filePath, "utf-8"));
    return fc.features.map(f => ({ ...f.properties, __geometry: f.geometry }));
  }
  if (filePath.endsWith(".shp")) {
    // Fallback: shpjs v4 no soporta file:// en Node, pero por si alguien tiene
    // una versión vieja, lo dejamos como aviso.
    throw new Error("Lee el .geojson correspondiente, no el .shp directo. shpjs no soporta file://");
  }
  if (filePath.endsWith(".csv")) {
    return parseCSV(readFileSync(filePath, "utf-8"));
  }
  throw new Error(`Extensión no soportada: ${filePath}`);
}

function readRowsSync(filePath) {
  if (filePath.endsWith(".csv")) {
    return parseCSV(readFileSync(filePath, "utf-8"));
  }
  throw new Error(`Sync solo soporta CSV: ${filePath}`);
}

// ------------------------------------------------------------------
// FK lookup cache: { table: Map<keyValue, idValue> }
//   PK column varies per table. We know them statically.
// ------------------------------------------------------------------
const PK_COLUMN = {
  bcs_lpa_municipio:          "id_municipio",
  bcs_lpa_vereda:             "id_vereda",
  bcs_dh_microcuenca:         "id_microcuenca",
  sgs_pre_propietario:        "id_propietario",
  sgs_pre_predio:            "id_predio",
  sgs_amb_cobertura_clc:      "id_cobertura",
  sgs_amb_bioma:              "id_bioma",
  sgs_amb_paramos:            "id_paramos",
  sgs_amb_zonificacion_pomca: "id_zonificacion_pomca",
  sgs_amb_zonificacion_rfp:   "id_zonificacion_rfp",
  sgs_com_componente:         "id_componente",
  sgs_com_accion:             "id_accion",
  sgs_pro_propuesta_punto:    "id_prop_punto",
  sgs_pro_propuesta_linea:    "id_prop_linea",
  sgs_pro_propuesta_poligono: "id_prop_poligono",
};

// In-memory store of source data, indexed by table. Populated lazily in
// dry-run mode so FK lookups can resolve from the GDB files (PG is empty
// during dry-run). Maps table -> array of raw GDB rows.
const INMEMORY_DATA = new Map();

async function loadTableDataInMemory(cfg) {
  if (INMEMORY_DATA.has(cfg.table)) return INMEMORY_DATA.get(cfg.table);
  let rows = [];
  if ((cfg.loader === "simple" || cfg.loader === "junction") && cfg.file) {
    rows = await readRows(join(EXPORT_DIR, cfg.file));
  } else if (cfg.loader === "derived") {
    const { source_layers, distinct_column, distinct_columns } = cfg.derived_from;
    const cols = distinct_columns || [distinct_column];
    const seen = new Set();
    for (const layer of source_layers) {
      const file = join(EXPORT_DIR, `${layer}.geojson`);
      if (!existsSync(file)) continue;
      const r = await readRows(file);
      for (const row of r) {
        const key = cols.map(c => row[c]).join("|");
        if (!seen.has(key) && cols.every(c => row[c])) seen.add(key);
      }
    }
    rows = [...seen].map(key => {
      const vals = key.split("|");
      const out = {};
      cols.forEach((c, i) => { out[c] = vals[i]; });
      return out;
    });
  } else if (cfg.loader === "synthesize") {
    const file = join(EXPORT_DIR, `${cfg.source_layer}.geojson`);
    if (existsSync(file)) {
      const r = await readRows(file);
      const seen = new Map();
      for (const row of r) {
        const k = row[cfg.from_column];
        if (k && String(k).trim() && !seen.has(k)) seen.set(k, true);
      }
      rows = [...seen.keys()].map(v => ({ [cfg.from_column]: v }));
    }
  }
  INMEMORY_DATA.set(cfg.table, rows);
  return rows;
}

async function buildFKCache(table, column) {
  const pk = PK_COLUMN[table];
  if (!pk) throw new Error(`PK_COLUMN no definido para ${table}`);

  // En dry-run la DB está vacía — leemos el archivo fuente de la tabla target
  // para validar que TODOS los FKs se resolverían al insertar.
  if (DRY_RUN) {
    const cfg = MAPPING_CONFIG.tables.find(t => t.table === table);
    if (cfg) {
      const rows = await loadTableDataInMemory(cfg);
      // Encontrar qué columna GDB mapea al PK de la tabla y a `column`
      const gdbColForPK = Object.entries(cfg.columns).find(([, pg]) => pg === pk)?.[0];
      const gdbColForLookup = Object.entries(cfg.columns).find(([, pg]) => pg === column)?.[0];
      const map = new Map();
      if (gdbColForPK) {
        // PK = natural key (la GDB tiene la col): cache = Map<GDB lookup, mismo valor>
        for (const r of rows) {
          const k = gdbColForLookup ? r[gdbColForLookup] : r[column];
          const v = r[gdbColForPK];
          if (k != null && v != null) map.set(String(k), v);
        }
      } else {
        // PK = SERIAL — simulamos IDs 1..N. Dry-run no necesita el id real,
        // solo validar que la lookup no falla.
        for (let i = 0; i < rows.length; i++) {
          const k = gdbColForLookup ? rows[i][gdbColForLookup] : rows[i][column];
          if (k != null) map.set(String(k), i + 1);
        }
      }
      return map;
    }
    // Tabla no está en el mapping (e.g. bcs_dh_quebrada) — caer a PG
  }

  // Modo real: consultar la tabla ya cargada en PG
  const rows = await sql`SELECT ${sql(column)} AS k, ${sql(pk)} AS v FROM ${sql(table)}`;
  const map = new Map();
  for (const r of rows) {
    if (r.k != null) map.set(String(r.k), r.v);
  }
  return map;
}

const FK_CACHE = new Map();
async function getFKCache(table, column) {
  const key = `${table}.${column}`;
  if (!FK_CACHE.has(key)) FK_CACHE.set(key, await buildFKCache(table, column));
  return FK_CACHE.get(key);
}

// ------------------------------------------------------------------
// Row mapping
// ------------------------------------------------------------------
function mapRow(gdbRow, cfg) {
  const out = {};
  for (const [gdbCol, pgCol] of Object.entries(cfg.columns)) {
    let val = gdbRow[gdbCol];
    if (val === undefined || val === "") val = null;
    if (pgCol === "geom" && val) {
      // gdbRow.__geometry is GeoJSON; build WKT
      out[pgCol] = geojsonToWKT(gdbRow.__geometry ?? val);
    } else {
      out[pgCol] = val;
    }
  }
  // Derivations: simple lookup tables declared en el mapping
  // Formato: cfg.derivations = { pgCol: { from: gdbCol, map: { fromVal: toVal } } }
  if (cfg.derivations) {
    for (const [pgCol, deriv] of Object.entries(cfg.derivations)) {
      const fromVal = gdbRow[deriv.from];
      out[pgCol] = (fromVal != null && deriv.map[String(fromVal)]) || null;
    }
  }
  return out;
}

function applyDefaults(out, defaults) {
  if (!defaults) return;
  for (const [k, v] of Object.entries(defaults)) {
    if (out[k] == null) out[k] = v;
  }
}

async function applyFKLookups(gdbRow, out, fkLookups) {
  if (!fkLookups) return out;
  for (const [pgCol, lookup] of Object.entries(fkLookups)) {
    // Leer el valor natural key del GDB row (no del `out` que es PG-side)
    const rawKey = gdbRow[lookup.from_column];
    if (rawKey == null || rawKey === "") {
      out[pgCol] = null;
      continue;
    }
    const cache = await getFKCache(lookup.to_table, lookup.to_column);
    const pgId = cache.get(String(rawKey));
    if (pgId == null) {
      // No match — dejamos NULL (o lo dropeamos)
      console.warn(`  WARN: ${pgCol}=${rawKey} (GDB col ${lookup.from_column}) no encontrado en ${lookup.to_table}.${lookup.to_column} → NULL`);
      out[pgCol] = null;
    } else {
      out[pgCol] = pgId;
    }
  }
  return out;
}

// ------------------------------------------------------------------
// Insert helpers
// ------------------------------------------------------------------
async function insertOne(table, row) {
  const cols = Object.keys(row).filter(k => row[k] !== undefined);
  const values = cols.map(k => row[k]);
  // Cast geometry columns a ST_GeomFromText
  const placeholders = cols.map((c, i) => {
    if (c === "geom") return `ST_GeomFromText($${i + 1}, 4686)`;
    return `$${i + 1}`;
  }).join(", ");
  const colsList = cols.map(c => c === "geom" ? "geom" : c).join(", ");
  await sql.unsafe(
    `INSERT INTO ${table} (${colsList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
    values,
  );
}

async function insertBatch(table, rows) {
  if (rows.length === 0) return;
  // Para simplicidad: insert uno por uno. 12k rows tarda segundos.
  for (const r of rows) await insertOne(table, r);
}

// ------------------------------------------------------------------
// Loaders
// ------------------------------------------------------------------
async function loaderSimple(cfg) {
  const file = join(EXPORT_DIR, cfg.file);
  if (!existsSync(file)) throw new Error(`No existe: ${file}`);
  const rows = await readRows(file);
  console.log(`  -> leyendo ${cfg.file}: ${rows.length} filas`);

  const mapped = [];
  for (const r of rows) {
    const out = mapRow(r, cfg);
    applyDefaults(out, cfg.defaults);
    await applyFKLookups(r, out, cfg.fk_lookups);
    mapped.push(out);
  }

  if (DRY_RUN) {
    console.log(`  -> DRY: insertaría ${mapped.length} filas en ${cfg.table}. Ejemplo: ${JSON.stringify(mapped[0]).slice(0, 200)}...`);
    return;
  }

  // Re-fetch FK cache ahora que sabemos que las tablas referenciadas están cargadas
  if (cfg.fk_lookups) {
    for (const lookup of Object.values(cfg.fk_lookups)) {
      await getFKCache(lookup.to_table, lookup.to_column);
    }
  }
  await insertBatch(cfg.table, mapped);
  console.log(`  -> OK ${mapped.length} filas en ${cfg.table}`);
}

async function loaderJunction(cfg) {
  // Igual a simple pero solo las columnas FK + métricas (sin geometry)
  return loaderSimple(cfg);
}

async function loaderDerived(cfg) {
  // Lee las source_layers, extrae valores únicos, los inserta en la tabla.
  const { source_layers, distinct_column, distinct_columns } = cfg.derived_from;
  const cols = distinct_columns || [distinct_column];
  const seen = new Set();
  for (const layer of source_layers) {
    const file = join(EXPORT_DIR, `${layer}.geojson`);
    if (!existsSync(file)) {
      console.warn(`  WARN: layer fuente no existe: ${file}`);
      continue;
    }
    const rows = await readRows(file);
    console.log(`  -> leyendo ${layer}.geojson: ${rows.length} filas (filtrando ${cols.join("+")})`);
    for (const r of rows) {
      const key = cols.map(c => r[c]).join("|");
      if (!seen.has(key) && cols.every(c => r[c])) {
        seen.add(key);
      }
    }
  }

  // Mapea a filas de la tabla target
  const records = [...seen].map(key => {
    const vals = key.split("|");
    const out = {};
    cols.forEach((c, i) => { out[c] = vals[i]; });
    return mapRow(out, cfg);
  });

  if (DRY_RUN) {
    console.log(`  -> DRY: ${records.length} filas derivadas para ${cfg.table}. Ejemplo: ${JSON.stringify(records[0])}`);
    return;
  }

  // Para derived que tiene FK lookups, refrescar después
  await insertBatch(cfg.table, records);
  console.log(`  -> OK ${records.length} filas derivadas en ${cfg.table}`);
}

async function loaderSynthesize(cfg) {
  // Lee source_layer, agrupa by from_column, crea rows únicos
  const file = join(EXPORT_DIR, `${cfg.source_layer}.geojson`);
  if (!existsSync(file)) throw new Error(`No existe: ${file}`);
  const rows = await readRows(file);
  console.log(`  -> leyendo ${cfg.source_layer}.geojson: ${rows.length} filas`);

  const seen = new Map();
  for (const r of rows) {
    const k = r[cfg.from_column];
    // Filtrar vacíos/whitespace para no crear filas inútiles con string vacío
    if (k && String(k).trim() && !seen.has(k)) seen.set(k, true);
  }

  const records = [...seen.keys()].map(v => {
    const out = {};
    out[cfg.from_column] = v;
    return mapRow(out, cfg);
  });
  applyDefaultsOnMany(records, cfg.defaults);

  if (DRY_RUN) {
    console.log(`  -> DRY: ${records.length} filas sintetizadas para ${cfg.table}. Ejemplo: ${JSON.stringify(records[0])}`);
    return;
  }

  await insertBatch(cfg.table, records);
  console.log(`  -> OK ${records.length} filas sintetizadas en ${cfg.table}`);
}

function applyDefaultsOnMany(records, defaults) {
  if (!defaults) return;
  for (const r of records) applyDefaults(r, defaults);
}

// ------------------------------------------------------------------
// Sequence reset
// ------------------------------------------------------------------
async function resetSequences() {
  // Para todas las tablas con SERIAL/BIGSERIAL, setval a MAX(id).
  // Listamos del information_schema.
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ${sql(TABLES_CFG.map(t => t.table))}
  `;
  for (const { table_name } of tables) {
    try {
      await sql.unsafe(
        `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${table_name}), 0) + 1, false)`,
        [table_name],
      );
    } catch (err) {
      // Algunas tablas no tienen id, no es error
      console.warn(`  WARN: no se pudo resetear sequence de ${table_name}: ${err.message.split("\n")[0]}`);
    }
  }
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
async function main() {
  const TABLES_CFG = MAPPING_CONFIG.tables.filter(t => !ONLY || ONLY.includes(t.table));

  console.log(`[import] Tablas a importar: ${TABLES_CFG.length} de ${MAPPING_CONFIG.tables.length}\n`);

  for (let i = 0; i < TABLES_CFG.length; i++) {
    const cfg = TABLES_CFG[i];
    console.log(`[${i + 1}/${TABLES_CFG.length}] ${cfg.table}  (${cfg.loader})`);
    try {
      switch (cfg.loader) {
        case "simple":    await loaderSimple(cfg); break;
        case "junction":  await loaderJunction(cfg); break;
        case "derived":   await loaderDerived(cfg); break;
        case "synthesize": await loaderSynthesize(cfg); break;
        default: throw new Error(`Loader desconocido: ${cfg.loader}`);
      }
    } catch (err) {
      console.error(`  ERROR en ${cfg.table}: ${err.message}`);
      if (DRY_RUN) throw err;
      // Si no es dry-run, seguimos (al menos sabemos qué falló)
    }
  }

  if (!DRY_RUN) {
    console.log("\n[import] Reseteando sequences...");
    await resetSequences();
  }

  console.log("\n[import] Listo.");
  await sql.end({ timeout: 5 });
}

main().catch(err => {
  console.error("\n[import] FATAL:", err);
  process.exit(1);
});
