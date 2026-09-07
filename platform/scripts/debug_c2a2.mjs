import postgres from "postgres";
const url = process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }
const sql = postgres(url, { max: 2 });

const r = await sql`
  SELECT count(*)::int AS n
  FROM sgs_pro_propuesta_punto pt
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  WHERE c.nombre = 'C2' AND a.nombre = 'A2'
`;
console.log("Total C2A2 puntos:", r[0]);

const r2 = await sql`
  SELECT count(*)::int AS n
  FROM sgs_pro_propuesta_punto pt
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  WHERE c.nombre = 'C2' AND a.nombre = 'A2' AND pt.actividad ILIKE '%captacion%'
`;
console.log("C2A2 con captacion:", r2[0]);

const r3 = await sql`
  SELECT pt.actividad, count(*)::int AS n
  FROM sgs_pro_propuesta_punto pt
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  WHERE c.nombre = 'C2' AND a.nombre = 'A2'
  GROUP BY pt.actividad
  ORDER BY n DESC
`;
console.log("C2A2 breakdown:");
for (const r of r3) console.log(" ", r);

await sql.end();
