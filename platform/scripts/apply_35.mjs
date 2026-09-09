// Aplica migration 34 (importaciones) directamente sin pasar por migrate.mjs
// (que falla porque 04 re-aplica un check constraint obsoleto después de 33).
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
import postgres from "postgres";
const s = postgres(process.env.DATABASE_URL, { max: 1 });
const sql = fs.readFileSync("scripts/db/init/34-importaciones.sql", "utf8");
try {
  await s.unsafe(sql);
  console.log("✓ Migration 34 aplicada");
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
} finally {
  await s.end();
}
