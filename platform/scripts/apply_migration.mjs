// Aplica una migration específica (sin pasar por migrate.mjs que tiene
// problemas con check constraints obsoletos después de 33).
// Uso: node scripts/apply_migration.mjs <archivo.sql>
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
import postgres from "postgres";
const file = process.argv[2] || "scripts/db/init/35-versionado-metas.sql";
const s = postgres(process.env.DATABASE_URL, { max: 1 });
const sql = fs.readFileSync(file, "utf8");
try {
  await s.unsafe(sql);
  console.log(`✓ ${file} aplicada`);
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
} finally {
  await s.end();
}
