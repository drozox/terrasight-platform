import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
import postgres from "postgres";
const s = postgres(process.env.DATABASE_URL, { max: 1 });
const r = await s`SELECT id_predio, nombre_predio, area_ha, cedula_catastral FROM sgs_pre_predio WHERE cedula_catastral LIKE 'IMP-%' ORDER BY id_predio DESC LIMIT 5`;
console.log("Últimos 5 predios importados:");
for (const row of r) console.log(`  ${row.id_predio}: ${row.nombre_predio} (${row.area_ha} ha, ${row.cedula_catastral})`);
const errs = await s`SELECT id_error, fila, columna, mensaje FROM sgs_adm_importacion_error WHERE id_importacion = 8 ORDER BY id_error`;
console.log("Errores de import 8:");
for (const e of errs) console.log(`  fila ${e.fila} (${e.columna}): ${e.mensaje}`);
await s.end();
