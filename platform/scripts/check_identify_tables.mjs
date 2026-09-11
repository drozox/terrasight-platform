// Verificar que las tablas que usa identify.ts existen
import postgres from "postgres";
const url = "process.env.DATABASE_URL ?? "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf"";
const sql = postgres(url, { max: 1, prepare: false });

const tablas = [
  "sgs_pre_predio",
  "sgs_pre_predio_alias",
  "sgs_pro_propuesta",
  "sgs_pro_propuesta_punto",
  "bcs_dh_quebrada",
  "sgs_inf_drenaje_simple",
  "sgs_inf_drenaje_doble",
  "sgs_inf_via",
  "bcs_lpa_municipio",
  "bcs_lpa_vereda",
  "bcs_dh_microcuenca",
];

const r = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = ANY(${tablas})
  ORDER BY table_name
`;
console.log("Tablas que existen:");
for (const row of r) console.log(`  ✓ ${row.table_name}`);
console.log("\nTablas que faltan:");
for (const t of tablas) {
  if (!r.find((row) => row.table_name === t)) console.log(`  ✗ ${t} (NO EXISTE)`);
}

// Verificar columnas específicas
console.log("\nColumnas de sgs_pre_predio:");
const cols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'sgs_pre_predio'
  ORDER BY ordinal_position
`;
for (const c of cols) console.log(`  ${c.column_name}`);

await sql.end();
