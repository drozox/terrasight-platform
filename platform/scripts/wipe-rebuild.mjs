#!/usr/bin/env node
// =============================================================================
// wipe-rebuild.mjs — DESTRUCTIVE: borra todo el schema public y lo recrea.
// Solo usar cuando se quiere re-importar la GDB desde cero.
// Uso: $env:DATABASE_URL = "..."; node scripts/wipe-rebuild.mjs
// =============================================================================
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.error("[wipe] Falta DATABASE_URL en el env");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });

try {
  await sql`SELECT 1 AS ping`;
  console.log("[wipe] Conexion OK");
} catch (err) {
  console.error("[wipe] Error conectando:", err.message);
  await sql.end({ timeout: 1 });
  process.exit(1);
}

console.log("[wipe] DROP SCHEMA public CASCADE...");
await sql.unsafe("DROP SCHEMA public CASCADE;");
console.log("[wipe] CREATE SCHEMA public...");
await sql.unsafe("CREATE SCHEMA public;");
await sql.unsafe("GRANT ALL ON SCHEMA public TO postgres;");
await sql.unsafe("GRANT ALL ON SCHEMA public TO public;");

const tables = await sql`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`;
console.log(`[wipe] Listo. Tablas en public: ${tables[0].n}`);

await sql.end({ timeout: 1 });
process.exit(0);
