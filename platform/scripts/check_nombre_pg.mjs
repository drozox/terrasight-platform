import postgres from "postgres";
import { readFileSync } from "node:fs";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

const dbRows = await sql`SELECT DISTINCT nombre FROM sgs_amb_zonificacion_rfp WHERE nombre IS NOT NULL ORDER BY nombre`;
console.log(`PG distinct NOMBRE: ${dbRows.length}`);
for (const r of dbRows) console.log("  | " + JSON.stringify(r.nombre));

// Compare with CSV
const csv = readFileSync("C:\\dev\\scratch\\gdb_export\\phase6\\sgs_rel_predio_zonificacion_rfp.csv", "utf-8");
const csvNames = new Set();
for (const line of csv.split("\n").slice(1)) {
  if (!line.trim()) continue;
  // Parse CSV with quote handling
  let inQ = false, field = "", row = [];
  for (let i = 0; i < line.length; i++) {
    const c = line[i], n = line[i+1];
    if (inQ) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(field); field = ""; }
      else field += c;
    }
  }
  row.push(field);
  // NOMBRE is column 27 (index 27)
  const nombre = (row[27] || "").trim();
  if (nombre) csvNames.add(nombre);
}
console.log(`\nCSV distinct NOMBRE: ${csvNames.size}`);
for (const n of csvNames) console.log(`  | ${n}`);

// Check intersection
const dbNames = new Set(dbRows.map(r => r.nombre));
const intersection = [...csvNames].filter(n => dbNames.has(n));
console.log("\nIntersection: " + intersection.length);
for (const n of intersection) console.log("  OK " + n);

await sql.end();
