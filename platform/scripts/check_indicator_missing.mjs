import postgres from "postgres";
import { readFileSync } from "node:fs";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

const dbIds = await sql`SELECT id_predio FROM sgs_pre_predio`;
const idSet = new Set(dbIds.map(r => r.id_predio));
console.log("DB id_predio count:", idSet.size);

const csv = readFileSync("C:\\dev\\scratch\\gdb_export\\phase6\\sgs_ind_predio.csv", "utf-8");
const lines = csv.split("\n").slice(1).filter(l => l.length > 0);
console.log("Indicator CSV rows:", lines.length);
const csvIds = new Set();
for (const l of lines) {
  const id = parseInt(l.split(",")[1]); // ID_predio
  csvIds.add(id);
}
let missing = [];
for (const id of csvIds) if (!idSet.has(id)) missing.push(id);
console.log("Missing id_predio in DB:", missing);
console.log("Missing count:", missing.length);

await sql.end();
