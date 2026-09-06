import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

// Find all FKs that reference bcs_dh_quebrada or sgs_inf_drenaje_doble
console.log("FKs que referencian bcs_dh_quebrada o sgs_inf_drenaje_doble:");
const fks = await sql`
  SELECT
    tc.table_name AS from_table,
    kcu.column_name AS from_col,
    ccu.table_name AS to_table,
    ccu.column_name AS to_col,
    rc.delete_rule AS on_delete
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name IN ('bcs_dh_quebrada', 'sgs_inf_drenaje_doble')
`;
for (const f of fks) console.log(" ", f);

console.log("\nFKs EN propuesta tables:");
const fks2 = await sql`
  SELECT
    tc.table_name AS from_table,
    kcu.column_name AS from_col,
    ccu.table_name AS to_table,
    ccu.column_name AS to_col,
    rc.delete_rule AS on_delete
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name LIKE 'sgs_pro_propuesta%'
`;
for (const f of fks2) console.log(" ", f);

await sql.end();
