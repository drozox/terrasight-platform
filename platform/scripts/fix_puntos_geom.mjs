// =============================================================================
// fix_puntos_geom.mjs — Reparar la geometría de sgs_pro_propuesta_punto.
//
// Contexto: el import inicial mapeó `este`/`norte` de campos que NO existen en
// la GDB (quedaron en 0) y no pobló `geom` → los 692 puntos no aparecían en el
// mapa. La GDB SÍ trae la geometría (capa `sgs_pro_propuesta_punto`, Point, CTM12).
//
// Uso:
//   1) Exportar la capa a GeoJSON reproyectada a 4686 (lon/lat):
//      & "C:\Program Files\QGIS 3.40.7\bin\ogr2ogr.exe" -f GeoJSON puntos.geojson \
//        "<...>\SIG_CAR_WWF_FN.gdb" sgs_pro_propuesta_punto -t_srs EPSG:4686 \
//        -select "OBJECTID,Actividad,Tipo_Obra"
//   2) DATABASE_URL=... node scripts/fix_puntos_geom.mjs puntos.geojson
//
// Seguridad: valida que la ACTIVIDAD por posición coincida (id_prop_punto ↔
// OBJECTID). Si no coincide, aborta sin tocar nada.
// =============================================================================

import postgres from "postgres";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) { console.error("Uso: node scripts/fix_puntos_geom.mjs <puntos.geojson>"); process.exit(2); }
const url = process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(2); }

const gj = JSON.parse(readFileSync(file, "utf8"));
const feats = gj.features ?? [];
const O = [], A = [], T = [], X = [], Y = [], W = [];
for (const f of feats) {
  const p = f.properties ?? {}, c = f.geometry?.coordinates;
  if (!c) continue;
  O.push(Number(p.OBJECTID)); A.push(String(p.Actividad ?? ""));
  T.push(Number(p.Tipo_Obra ?? 0)); X.push(Number(c[0])); Y.push(Number(c[1]));
  W.push(`POINT(${c[0]} ${c[1]})`);
}
console.log(`[fix] features en GeoJSON: ${feats.length}`);

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await sql.begin(async (tx) => {
    await tx`CREATE TEMP TABLE _stg (objectid int, actividad text, tipo_obra int, lon float8, lat float8, wkt text)`;
    await tx`INSERT INTO _stg SELECT * FROM unnest(${sql.array(O, 23)}, ${sql.array(A, 25)}, ${sql.array(T, 23)}, ${sql.array(X, 701)}, ${sql.array(Y, 701)}, ${sql.array(W, 25)})`;
    const [v] = await tx`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE lower(unaccent(p.actividad)) <> lower(unaccent(s.actividad)))::int AS act_mismatch
      FROM _stg s JOIN sgs_pro_propuesta_punto p ON p.id_prop_punto = s.objectid`;
    console.log("[fix] validacion:", v);
    if (v.act_mismatch > 0) throw new Error("actividad no coincide -> abort (orden != OBJECTID)");
    const upd = await tx`
      UPDATE sgs_pro_propuesta_punto p
      SET geom = ST_Multi(ST_GeomFromText(s.wkt, 4686)), este = s.lon, norte = s.lat
      FROM _stg s WHERE p.id_prop_punto = s.objectid`;
    console.log(`[fix] filas actualizadas: ${upd.count}`);
  });
  const [r] = await sql`SELECT count(*)::int AS n, count(geom)::int AS con_geom FROM sgs_pro_propuesta_punto`;
  console.log("[fix] post:", r);
} finally { await sql.end(); }
