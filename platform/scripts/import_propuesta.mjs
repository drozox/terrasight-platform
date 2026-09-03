#!/usr/bin/env node
// =============================================================================
// import_propuesta.mjs — Phase 2: importa propuesta super-tipo + 3 subtipos
//
// Flujo:
//   1. Lee los 3 archivos GDB hijos (punto, linea, poligono)
//   2. Sintetiza sgs_com_componente y sgs_com_accion desde unique (componente, accion)
//   3. Inserta componentes y acciones en PG
//   4. Para cada row hijo, crea un row en sgs_pro_propuesta (super-tipo)
//      - id_predio del GDB (NULL para punto), id_quebrada=NULL, id_accion lookup
//   5. Inserta el row hijo con id_propuesta FK al super
//
// Uso:
//   $env:DATABASE_URL = "postgresql://...";
//   node scripts/import_propuesta.mjs
// =============================================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const EXPORT_DIR = process.env.GDB_EXPORT_DIR || "C:\\dev\\scratch\\gdb_export";
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error("[propuesta] Falta DATABASE_URL en el env");
  process.exit(1);
}

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
    default: throw new Error(`Geometry type: ${t}`);
  }
}

async function main() {
  console.log(`[propuesta] DB: ${DB_URL.replace(/:[^:@/]+@/, ":***@")}`);

  // 1. Read source files
  const punto = readGeoJSON("sgs_pro_propuesta_punto.geojson");
  const linea = readGeoJSON("sgs_pro_propuesta_linea.geojson");
  const poligono = readGeoJSON("sgs_pro_propuesta_poligono.geojson");
  console.log(`[propuesta] Leídos: punto=${punto.length} linea=${linea.length} poligono=${poligono.length}`);

  // 2. Synthesize componentes y acciones
  // Cada child row tiene `componente` (texto) y `accion` (texto)
  const compSet = new Set();
  const actionSet = new Map(); // "componente|accion" -> {componente, accion}
  for (const r of [...punto, ...linea, ...poligono]) {
    if (r.componente) compSet.add(r.componente);
    if (r.componente && r.accion) {
      const key = `${r.componente}|${r.accion}`;
      if (!actionSet.has(key)) actionSet.set(key, { componente: r.componente, accion: r.accion });
    }
  }
  console.log(`[propuesta] Componentes únicos: ${compSet.size}, Acciones únicas: ${actionSet.size}`);

  // 3. Insert componentes (id_componente SERIAL)
  const compIdMap = new Map();
  for (const c of compSet) {
    const rows = await sql`
      INSERT INTO sgs_com_componente (nombre) VALUES (${c})
      ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING id_componente
    `;
    compIdMap.set(c, rows[0].id_componente);
  }
  console.log(`[propuesta] Componentes insertados: ${compIdMap.size}`);

  // 4. Insert acciones (FK a componente)
  const actionIdMap = new Map();
  for (const [key, { componente, accion }] of actionSet) {
    const idComponente = compIdMap.get(componente);
    const rows = await sql`
      INSERT INTO sgs_com_accion (id_componente, nombre)
      VALUES (${idComponente}, ${accion})
      ON CONFLICT (id_componente, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING id_accion
    `;
    actionIdMap.set(key, rows[0].id_accion);
  }
  console.log(`[propuesta] Acciones insertadas: ${actionIdMap.size}`);

  // 5. Para cada child, crear super-tipo + insertar child
  // La estrategia: insertar el super-tipo primero, obtener id_propuesta, luego insertar child
  async function processChild(type, rows, geometryType) {
    console.log(`[propuesta] Procesando ${type}: ${rows.length} filas`);
    let ok = 0, errors = 0;
    for (const r of rows) {
      try {
        const idAccion = actionIdMap.get(`${r.componente}|${r.accion}`);
        const idPredio = r.id_predio || null; // punto tiene id_predio vacío en GDB
        // 5a. Insert super-tipo
        const supRows = await sql`
          INSERT INTO sgs_pro_propuesta (tipo, actividad, id_predio, id_quebrada, id_accion)
          VALUES (${type}, ${r.actividad || ""}, ${idPredio}, NULL, ${idAccion})
          RETURNING id_propuesta
        `;
        const idPropuesta = supRows[0].id_propuesta;
        // 5b. Insert child
        if (type === "punto") {
          // Mapear tipo_obra (0/1/2/3) a tipo_punto. El GDB no tiene tipo_punto.
          const tipoObra = parseInt(r.tipo_obra) || 0;
          const tipoPunto = tipoObra === 1 ? "obra_captacion"
                          : tipoObra === 2 ? "estacion_limnimetrica"
                          : tipoObra === 3 ? "bebedero"
                          : "obra_captacion"; // default para 0 u otros
          await sql`
            INSERT INTO sgs_pro_propuesta_punto (
              actividad, este, norte, descripcion, tipo_punto, tipo_obra,
              id_propuesta, id_quebrada, geom
            ) VALUES (
              ${r.actividad || ""},
              ${parseFloat(r.este) || 0},
              ${parseFloat(r.norte) || 0},
              ${r.descripcion || ""},
              ${tipoPunto},
              ${tipoObra},
              ${idPropuesta},
              NULL,
              ${r.__geometry ? sql`ST_GeomFromText(${geojsonToWKT(r.__geometry)}, 4686)` : sql`NULL`}
            )
          `;
        } else if (type === "linea") {
          await sql`
            INSERT INTO sgs_pro_propuesta_linea (
              actividad, longitud_m, longitud_km, id_propuesta, geom
            ) VALUES (
              ${r.actividad || ""},
              ${parseFloat(r.long_m) || 0},
              ${parseFloat(r.long_km) || 0},
              ${idPropuesta},
              ${r.__geometry ? sql`ST_GeomFromText(${geojsonToWKT(r.__geometry)}, 4686)` : sql`NULL`}
            )
          `;
        } else if (type === "poligono") {
          await sql`
            INSERT INTO sgs_pro_propuesta_poligono (
              actividad, area_ha, area_m2, id_propuesta, geom
            ) VALUES (
              ${r.actividad || ""},
              ${parseFloat(r.area_ha) || 0},
              ${parseFloat(r.area_m2) || 0},
              ${idPropuesta},
              ${r.__geometry ? sql`ST_GeomFromText(${geojsonToWKT(r.__geometry)}, 4686)` : sql`NULL`}
            )
          `;
        }
        ok++;
        if (ok % 100 === 0) console.log(`  ${type}: ${ok}/${rows.length}`);
      } catch (e) {
        errors++;
        if (errors < 5) console.warn(`  ERROR en ${type} #${ok+errors}: ${e.message.split("\n")[0]}`);
      }
    }
    console.log(`[propuesta] ${type}: ${ok} OK, ${errors} errores`);
    return ok;
  }

  // Process in order
  await processChild("linea", linea);
  await processChild("poligono", poligono);
  await processChild("punto", punto);

  // Final counts
  const counts = await sql`
    SELECT
      (SELECT count(*)::int FROM sgs_pro_propuesta) AS super,
      (SELECT count(*)::int FROM sgs_pro_propuesta_punto) AS punto,
      (SELECT count(*)::int FROM sgs_pro_propuesta_linea) AS linea,
      (SELECT count(*)::int FROM sgs_pro_propuesta_poligono) AS poligono
  `;
  console.log(`[propuesta] Counts: super=${counts[0].super} punto=${counts[0].punto} linea=${counts[0].linea} poligono=${counts[0].poligono}`);

  await sql.end({ timeout: 5 });
}

main().catch(err => {
  console.error("[propuesta] FATAL:", err.message);
  process.exit(1);
});
