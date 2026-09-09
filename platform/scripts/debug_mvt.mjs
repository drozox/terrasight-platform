// Debug script para encontrar tile con features.
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const { sql } = await import("../src/lib/db.ts");

console.log("=== Búsqueda de tile con drenajes en Cundinamarca (z=10) ===");
for (let x = 298; x <= 306; x++) {
  for (let y = 500; y <= 510; y++) {
    const r = await sql`
      SELECT (SELECT count(*)::int FROM sgs_inf_drenaje_simple
              WHERE ST_Intersects(geom, ST_Transform(ST_TileEnvelope(10, ${x}, ${y}), 4686))) AS n
    `;
    if (r[0].n > 0) console.log(`z=10 x=${x} y=${y} n=${r[0].n}`);
  }
}

console.log("\n=== ST_AsMVT test en (300, 500) — tiene 69 features ===");
const mvt = await sql`
  WITH tile AS (
    SELECT ST_TileEnvelope(10, 300, 500) AS env_3857,
           ST_Transform(ST_TileEnvelope(10, 300, 500), 4686) AS env_4686
  ),
  mvt_data AS (
    SELECT ST_AsMVTGeom(ST_Transform(geom, 3857), tile.env_3857, 4096, 256, true) AS geom,
           id_drenaje_simple::int AS id, nombre_geografico AS nombre
    FROM sgs_inf_drenaje_simple, tile
    WHERE geom IS NOT NULL AND ST_Intersects(geom, tile.env_4686)
  )
  SELECT ST_AsMVT(mvt_data, 'drenajes', 4096) AS mvt,
         octet_length(ST_AsMVT(mvt_data, 'drenajes', 4096)) AS len
  FROM mvt_data
`;
console.log("Result:", mvt[0]);

process.exit(0);
