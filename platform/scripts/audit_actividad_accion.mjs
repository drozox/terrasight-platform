// audit_actividad_accion.mjs — Verificar mapeo actividad ↔ componente
import postgres from "postgres";
const url = process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }
const sql = postgres(url, { max: 2 });

console.log("=== ¿Qué id_accion tienen las propuestas_punto de Obras de captación? ===");
const o = await sql`
  SELECT pp.id_accion, c.nombre AS comp, a.nombre AS acc, count(*)::int AS n
  FROM sgs_pro_propuesta_punto pt
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  WHERE pt.actividad ILIKE '%captacion%' OR pt.actividad ILIKE '%obra%'
  GROUP BY pp.id_accion, c.nombre, a.nombre
  ORDER BY n DESC
`;
for (const r of o) console.log(" ", r);

console.log("\n=== ¿Qué id_accion tienen las propuestas_punto de Estación limnimétrica? ===");
const e = await sql`
  SELECT pp.id_accion, c.nombre AS comp, a.nombre AS acc, count(*)::int AS n
  FROM sgs_pro_propuesta_punto pt
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  WHERE pt.actividad ILIKE '%estacion%limnimet%' OR pt.actividad ILIKE '%limnimet%'
  GROUP BY pp.id_accion, c.nombre, a.nombre
  ORDER BY n DESC
`;
for (const r of e) console.log(" ", r);

console.log("\n=== Componente/acción de TODAS las propuestas_punto (sample) ===");
const all = await sql`
  SELECT pp.id_accion, c.nombre AS comp, a.nombre AS acc, pt.actividad, count(*)::int AS n
  FROM sgs_pro_propuesta_punto pt
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  GROUP BY pp.id_accion, c.nombre, a.nombre, pt.actividad
  ORDER BY n DESC
  LIMIT 30
`;
for (const r of all) console.log(`  ${r.comp}/${r.acc.padEnd(5)} | ${r.actividad.padEnd(60)} | n=${r.n}`);

console.log("\n=== ¿Qué id_accion tienen las propuestas_polígono de C1A2? ===");
const p = await sql`
  SELECT pp.id_accion, c.nombre AS comp, a.nombre AS acc, pq.actividad, count(*)::int AS n
  FROM sgs_pro_propuesta_poligono pq
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  GROUP BY pp.id_accion, c.nombre, a.nombre, pq.actividad
  ORDER BY n DESC
  LIMIT 20
`;
for (const r of p) console.log(`  ${r.comp}/${r.acc.padEnd(5)} | ${r.actividad.padEnd(60)} | n=${r.n}`);

await sql.end();
