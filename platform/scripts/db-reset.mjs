#!/usr/bin/env node
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
try { await sql`SELECT 1 AS ping`; console.log("[reset] OK connect"); } catch (e) { console.error("[reset] connect err:", e.message); await sql.end({timeout:1}); process.exit(1); }
console.log("[reset] DROP...");
await sql.unsafe("DROP SCHEMA public CASCADE;");
await sql.unsafe("CREATE SCHEMA public;");
await sql.unsafe("GRANT ALL ON SCHEMA public TO postgres;");
await sql.unsafe("GRANT ALL ON SCHEMA public TO public;");
const t = await sql`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'`;
console.log(`[reset] Tablas en public: ${t[0].n}`);
await sql.end({timeout:1});
