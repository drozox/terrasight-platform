import postgres from "postgres";
import { readFileSync } from "node:fs";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

// Check which id_predio values exist
const dbIds = await sql`SELECT id_predio FROM sgs_pre_predio`;
const idSet = new Set(dbIds.map(r => r.id_predio));
console.log("DB id_predio count:", idSet.size);
console.log("Sample:", [...idSet].slice(0, 5).join(","));

// Read pomca CSV
const csv = readFileSync("C:\\dev\\scratch\\gdb_export\\phase6\\sgs_rel_predio_zonificacion_pomca.csv", "utf-8");
const lines = csv.split("\n").slice(1).filter(l => l.length > 0);
console.log("\nPomca CSV total rows:", lines.length);
const csvIds = new Set();
for (const l of lines) {
  const id = parseInt(l.split(",")[1]); // ID_predio is column 1
  csvIds.add(id);
}
console.log("Unique id_predio in pomca CSV:", csvIds.size);
let missing = 0;
for (const id of csvIds) if (!idSet.has(id)) missing++;
console.log("Missing in DB:", missing);

// Check rfp CSV
const rfp = readFileSync("C:\\dev\\scratch\\gdb_export\\phase6\\sgs_rel_predio_zonificacion_rfp.csv", "utf-8");
const rfpLines = rfp.split("\n").slice(1).filter(l => l.length > 0);
console.log("\nRFP CSV total rows:", rfpLines.length);
const rfpIds = new Set();
for (const l of rfpLines) {
  const id = parseInt(l.split(",")[1]);
  rfpIds.add(id);
}
console.log("Unique id_predio in rfp CSV:", rfpIds.size);
let rfpMissing = 0;
for (const id of rfpIds) if (!idSet.has(id)) rfpMissing++;
console.log("Missing in DB:", rfpMissing);

// Check what's failing
console.log("\nPomca id_zonificacion_pomca distribution:");
const dbPonCount = await sql`SELECT count(*)::int AS n FROM sgs_amb_zonificacion_pomca`;
console.log("  Lookup total:", dbPonCount[0].n);
const dbPonIds = await sql`SELECT id_zonificacion_pomca, categoria_zonificacion FROM sgs_amb_zonificacion_pomca ORDER BY id_zonificacion_pomca LIMIT 10`;
for (const r of dbPonIds) console.log(" ", r);

await sql.end();
