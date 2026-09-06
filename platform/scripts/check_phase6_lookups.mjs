import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }
const sql = postgres(url, { max: 2 });

const tbls = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name LIKE 'sgs_amb%'
  ORDER BY table_name
`;
console.log("Lookup tables existentes:");
for (const t of tbls) console.log(" ", t.table_name);

console.log("\n--- Cobertura ---");
const c = await sql`SELECT id_cobertura, nombre_cobertura FROM sgs_amb_cobertura_clc ORDER BY id_cobertura LIMIT 5`;
for (const x of c) console.log(" ", x.id_cobertura, "|", x.nombre_cobertura);
const ct = await sql`SELECT count(*)::int as n FROM sgs_amb_cobertura_clc`;
console.log("Total:", ct[0].n);

console.log("\n--- Bioma ---");
const b = await sql`SELECT id_bioma, bioma_iavh FROM sgs_amb_bioma ORDER BY id_bioma LIMIT 5`;
for (const x of b) console.log(" ", x.id_bioma, "|", x.bioma_iavh);
const bt = await sql`SELECT count(*)::int as n FROM sgs_amb_bioma`;
console.log("Total:", bt[0].n);

console.log("\n--- Paramos ---");
const p = await sql`SELECT id_paramos, nombre_paramo FROM sgs_amb_paramos ORDER BY id_paramos LIMIT 5`;
for (const x of p) console.log(" ", x.id_paramos, "|", x.nombre_paramo);
const pt = await sql`SELECT count(*)::int as n FROM sgs_amb_paramos`;
console.log("Total:", pt[0].n);

console.log("\n--- POMCA ---");
const poCols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name='sgs_amb_zonificacion_pomca' ORDER BY ordinal_position
`;
console.log("Cols:", poCols.map(c=>c.column_name).join(", "));
const po = await sql`SELECT * FROM sgs_amb_zonificacion_pomca ORDER BY id_zonificacion_pomca LIMIT 5`;
for (const x of po) console.log(" ", x);
const pot = await sql`SELECT count(*)::int as n FROM sgs_amb_zonificacion_pomca`;
console.log("Total:", pot[0].n);

console.log("\n--- RFP ---");
const rfCols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name='sgs_amb_zonificacion_rfp' ORDER BY ordinal_position
`;
console.log("Cols:", rfCols.map(c=>c.column_name).join(", "));
const rf = await sql`SELECT * FROM sgs_amb_zonificacion_rfp ORDER BY id_zonificacion_rfp LIMIT 5`;
for (const x of rf) console.log(" ", x);
const rft = await sql`SELECT count(*)::int as n FROM sgs_amb_zonificacion_rfp`;
console.log("Total:", rft[0].n);

console.log("\n--- Predios ---");
const pr = await sql`SELECT count(*)::int as n, MIN(id_predio) as min, MAX(id_predio) as max FROM sgs_pre_predio`;
console.log("Total:", pr[0].n, "min:", pr[0].min, "max:", pr[0].max);
const sample = await sql`SELECT id_predio FROM sgs_pre_predio ORDER BY id_predio LIMIT 5`;
console.log("Sample ids:", sample.map(s=>s.id_predio).join(","));

console.log("\n--- Municipio nombres ---");
const mun = await sql`SELECT id_municipio, nombre_municipio FROM bcs_lpa_municipio ORDER BY id_municipio`;
for (const x of mun) console.log(" ", x.id_municipio, "|", x.nombre_municipio);

console.log("\n--- Indicador tables (deben existir vacías) ---");
const ind = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name LIKE 'sgs_ind%'
  ORDER BY table_name
`;
for (const t of ind) console.log(" ", t.table_name);

await sql.end();
