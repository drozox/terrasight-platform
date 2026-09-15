#!/usr/bin/env node
// =============================================================================
// Aplica las migraciones 38-42 al Supabase (CAR Cundinamarca) usando DIRECT_URL.
// Uso:
//   node scripts/apply_38_to_42.mjs
// Idempotente — todas las migraciones usan IF NOT EXISTS / CREATE OR REPLACE.
// =============================================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const initDir = new URL("./db/init/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) { console.error("[apply-38-42] Falta DIRECT_URL o DATABASE_URL en env"); process.exit(1); }

const TARGETS = [
  "38-propuesta-alarmas.sql",          // DEEPSEEK-F2.3
  "39-predio-shape-wkt.sql",           // DEEPSEEK-F3.4
  "40-metas-idaccion.sql",             // DEEPSEEK-F4
  "41-c3-accion-u.sql",                // DEEPSEEK-F4 fix
  "42-metas-fixes-c1a2-c2a2-c3.sql",   // DEEPSEEK-F4 + data quality fixes
];

const sql = postgres(connectionString, { max: 1, onnotice: () => {} });

console.log("[apply-38-42] Host: " + new URL(connectionString).host);
console.log("[apply-38-42] Migraciones: " + TARGETS.length);

try {
  await sql`SELECT 1`;
  console.log("[apply-38-42] Conexion OK\n");
} catch (err) {
  console.error("[apply-38-42] No se pudo conectar: " + err.message);
  await sql.end({timeout:1});
  process.exit(1);
}

let ok = 0, skipped = 0, failed = 0;
for (const f of TARGETS) {
  const path = join(initDir, f);
  let content;
  try { content = readFileSync(path, "utf8"); }
  catch (err) { console.log(`[apply-38-42] FAIL ${f}: no se puede leer (${err.message})`); failed++; continue; }

  process.stdout.write(`[apply-38-42] Aplicando ${f} ... `);
  try {
    await sql.unsafe(content);
    process.stdout.write("OK\n"); ok++;
  } catch (err) {
    const msg = err.message.split("\n")[0];
    if (/already exists|duplicate key|IF NOT EXISTS/i.test(err.message)) {
      process.stdout.write("(ya aplicado, skip)\n"); skipped++;
    } else {
      process.stdout.write(`FAIL: ${msg}\n`); failed++;
    }
  }
}

console.log("");
console.log(`[apply-38-42] Resultado: ${ok} OK, ${skipped} skipped, ${failed} failed`);
await sql.end({timeout:1});
process.exit(failed > 0 ? 1 : 0);
