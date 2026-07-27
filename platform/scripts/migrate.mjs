#!/usr/bin/env node
// =============================================================================
// Aplica las migraciones SQL a la base de datos apuntada por DATABASE_URL.
//
// Uso:
//   node scripts/migrate.mjs                 (aplica 01..09)
//   node scripts/migrate.mjs --no-seed       (no aplica 02-datos-ejemplo)
//   node scripts/migrate.mjs --dry-run       (muestra lo que haria, no ejecuta)
//
// Compatible con Supabase free tier (respeta ?sslmode=require) y con local.
// =============================================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const args = process.argv.slice(2);
const noSeed = args.includes("--no-seed");
const dryRun = args.includes("--dry-run");
const initDir = new URL("./db/init/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf";

const sql = postgres(connectionString, { max: 1, onnotice: () => {} });

const ORDER = ["01-schema.sql","02-datos-ejemplo.sql","03-auth-schema.sql","04-intervencion-estado.sql","05-catalogos-unique.sql","06-propuesta-avance.sql","07-monitoreo-punto.sql","08-cat-secundarios.sql","09-propuesta-avance-es-backfill.sql","10-sgs-amb-alerta.sql"];

const missing = ORDER.filter((f) => { try { readFileSync(join(initDir, f)); return false; } catch { return true; } });
if (missing.length) { console.error("[migrate] Faltan archivos: " + missing.join(", ")); process.exit(2); }

const files = ORDER.filter((f) => !(noSeed && f === "02-datos-ejemplo.sql"));
console.log("[migrate] Conectando a: " + maskConnStr(connectionString));
console.log("[migrate] Migraciones a aplicar: " + files.length);
for (const f of files) console.log("  - " + f);

if (dryRun) { console.log("[migrate] --dry-run: no se ejecuta nada"); await sql.end({ timeout: 1 }); process.exit(0); }

try { await sql`SELECT 1 AS ping`; console.log("[migrate] Conexion OK"); } catch (err) { console.error("[migrate] Error: " + err.message); await sql.end({ timeout: 1 }); process.exit(1); }

let ok = 0, skipped = 0, failed = 0;
for (const f of files) {
  const path = join(initDir, f);
  const content = readFileSync(path, "utf8");
  process.stdout.write("[migrate] Aplicando " + f + " ... ");
  try { await sql.unsafe(content); process.stdout.write("OK\n"); ok++; }
  catch (err) {
    if (/already exists|duplicate key|IF NOT EXISTS/i.test(err.message)) { process.stdout.write("(ya aplicado, skip)\n"); skipped++; }
    else { process.stdout.write("FAIL: " + err.message + "\n"); failed++; }
  }
}

console.log("");
console.log("[migrate] Resultado: " + ok + " OK, " + skipped + " skipped, " + failed + " failed");
await sql.end({ timeout: 1 });
process.exit(failed > 0 ? 1 : 0);

function maskConnStr(s) { return s.replace(/:[^:@/]+@/, ":***@"); }
