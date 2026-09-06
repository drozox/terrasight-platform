import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

// Build arrays as strings like '{1,2,3}'
const a1 = `{${[1,2,3].join(",")}}`;
const a2 = `{${[10,20,30].join(",")}}`;
const a3 = `{${[0.5,1.0,1.5].join(",")}}`;
const a4 = `{${[10.0,20.0,30.0].join(",")}}`;

const r1 = await sql.unsafe(`SELECT t.ip, t.it FROM UNNEST($1::int[], $2::int[]) AS t(ip, it)`, [a1, a2]);
console.log("Test 1 (alias t(ip,it)):", r1);

const r5 = await sql.unsafe(`
  INSERT INTO sgs_rel_predio_cobertura (id_predio, id_cobertura, area_interseccion_ha, porcentaje_predio)
  SELECT t.ip, t.it, t.ar, t.pc FROM UNNEST($1::int[], $2::int[], $3::numeric[], $4::numeric[]) AS t(ip, it, ar, pc)
  ON CONFLICT DO NOTHING
  RETURNING id_predio
`, [a1, a2, a3, a4]);
console.log("Test 5 (junction insert with UNNEST):", r5);

await sql.unsafe(`DELETE FROM sgs_rel_predio_cobertura WHERE id_predio IN (1,2,3) AND id_cobertura IN (1,2,3)`);

await sql.end();
