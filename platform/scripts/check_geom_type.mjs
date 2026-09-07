// check_geom_type.mjs — Verificar tipo de geom y unidades
import postgres from "postgres";
const url = process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }
const sql = postgres(url, { max: 2 });

console.log("Tipo de geom en propuesta_línea:");
const t = await sql`
  SELECT f_table_name, type, srid
  FROM geometry_columns
  WHERE f_table_name LIKE 'sgs_pro_propuesta%'
  ORDER BY f_table_name
`;
for (const r of t) console.log(" ", r);

console.log("\nEjemplo de ST_Length vs ST_Length(geography):");
const ex = await sql`
  SELECT id_prop_linea, actividad,
         ST_AsText(geom) AS wkt,
         ST_Length(geom) AS len_geom,
         ST_Length(geom::geography) AS len_geog_m,
         longitud_m, longitud_km
  FROM sgs_pro_propuesta_linea
  WHERE actividad = 'Cerco vivo'
  LIMIT 5
`;
for (const r of ex) console.log(" ", {
  id: r.id_prop_linea,
  actividad: r.actividad,
  wkt: r.wkt?.slice(0, 80),
  len_geom: Number(r.len_geom).toFixed(4),
  len_geog_m: Number(r.len_geog_m).toFixed(2),
  longitud_m: r.longitud_m,
  longitud_km: r.longitud_km,
});

console.log("\nEjemplo de ST_Area en propuesta_polígono:");
const ex2 = await sql`
  SELECT id_prop_poligono, actividad,
         ST_AsText(geom) AS wkt,
         ST_Area(geom) AS area_geom,
         ST_Area(geom::geography) AS area_geog_m2,
         area_ha, area_m2
  FROM sgs_pro_propuesta_poligono
  WHERE actividad = 'Enriquecimiento - Pastos arbolados'
  LIMIT 3
`;
for (const r of ex2) console.log(" ", {
  id: r.id_prop_poligono,
  wkt: r.wkt?.slice(0, 80),
  area_geom: Number(r.area_geom).toFixed(4),
  area_geog_m2: Number(r.area_geog_m2).toFixed(2),
  area_ha: r.area_ha,
  area_m2: r.area_m2,
});

await sql.end();
