// Verificar columnas de las tablas usadas en identify
import postgres from "postgres";
const url = process.env.DATABASE_URL ?? "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf";
const sql = postgres(url, { max: 1, prepare: false });

const tablas = [
  "sgs_pro_propuesta",
  "sgs_pro_propuesta_punto",
  "bcs_dh_quebrada",
  "sgs_inf_drenaje_simple",
  "sgs_inf_via",
  "bcs_lpa_municipio",
  "bcs_lpa_vereda",
  "bcs_dh_microcuenca",
];

for (const tabla of tablas) {
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tabla}
    ORDER BY ordinal_position
  `;
  console.log(`\n${tabla}:`);
  for (const c of cols) console.log(`  ${c.column_name}`);
}

await sql.end();
