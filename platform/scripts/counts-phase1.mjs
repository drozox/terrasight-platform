import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const tables = ["bcs_lpa_municipio", "bcs_lpa_vereda", "bcs_dh_microcuenca", "sgs_pre_propietario", "sgs_pre_predio"];
for (const t of tables) {
  const r = await sql`SELECT count(*)::int n FROM ${sql(t)}`;
  console.log(`  ${t}: ${r[0].n}`);
}
await sql.end({timeout:1});
