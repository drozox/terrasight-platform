// audit_metas.mjs — Verificar qué datos tenemos para las 5 metas + adicional
import postgres from "postgres";
const url = process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }
const sql = postgres(url, { max: 2, onnotice: () => {} });

console.log("=== 1. Componentes y acciones disponibles ===");
const comp = await sql`SELECT id_componente, nombre FROM sgs_com_componente ORDER BY id_componente`;
console.log("Componentes:", comp);
const acc = await sql`
  SELECT c.nombre AS componente, a.id_accion, a.nombre AS accion
  FROM sgs_com_accion a JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  ORDER BY c.nombre, a.nombre
`;
console.log("\nAcciones por componente:");
for (const r of acc) console.log(`  ${r.componente} → ${r.accion}`);

console.log("\n=== 2. Propuestas con actividad (sample de actividades) ===");
const acts = await sql`
  SELECT tipo, actividad, count(*)::int AS n
  FROM sgs_pro_propuesta
  WHERE actividad IS NOT NULL AND actividad <> ''
  GROUP BY tipo, actividad
  ORDER BY n DESC
  LIMIT 50
`;
console.log("Top 50 (tipo, actividad, count):");
for (const r of acts) console.log(`  ${r.tipo.padEnd(10)} | ${r.actividad.padEnd(60)} | ${r.n}`);

console.log("\n=== 3. Propuestas_línea con actividad relevante (C1A1) ===");
const c1a1 = await sql`
  SELECT actividad, count(*)::int AS n,
         COALESCE(SUM(longitud_km), 0)::numeric AS total_km
  FROM sgs_pro_propuesta_linea
  WHERE id_propuesta IN (
    SELECT id_propuesta FROM sgs_pro_propuesta
    WHERE id_accion IN (
      SELECT a.id_accion FROM sgs_com_accion a
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE c.nombre = 'C1' AND a.nombre = 'A1'
    )
  ) AND actividad IS NOT NULL
  GROUP BY actividad
  ORDER BY n DESC
`;
console.log("C1A1 - Propuestas_línea por actividad:");
for (const r of c1a1) console.log(`  ${r.actividad.padEnd(60)} | n=${r.n} | ${Number(r.total_km).toFixed(2)} km`);

console.log("\n=== 4. Propuestas_polígono con actividad relevante (C1A2) ===");
const c1a2 = await sql`
  SELECT actividad, count(*)::int AS n,
         COALESCE(SUM(area_ha), 0)::numeric AS total_ha
  FROM sgs_pro_propuesta_poligono
  WHERE id_propuesta IN (
    SELECT id_propuesta FROM sgs_pro_propuesta
    WHERE id_accion IN (
      SELECT a.id_accion FROM sgs_com_accion a
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE c.nombre = 'C1' AND a.nombre = 'A2'
    )
  ) AND actividad IS NOT NULL
  GROUP BY actividad
  ORDER BY n DESC
`;
console.log("C1A2 - Propuestas_polígono por actividad:");
for (const r of c1a2) console.log(`  ${r.actividad.padEnd(60)} | n=${r.n} | ${Number(r.total_ha).toFixed(2)} ha`);

console.log("\n=== 5. Propuestas_punto con actividad (C2A1, C2A2) ===");
const puntos = await sql`
  SELECT actividad, count(*)::int AS n
  FROM sgs_pro_propuesta_punto
  WHERE actividad IS NOT NULL
  GROUP BY actividad
  ORDER BY n DESC
`;
console.log("Propuestas_punto por actividad (todas):");
for (const r of puntos) console.log(`  ${r.actividad.padEnd(60)} | n=${r.n}`);

console.log("\n=== 6. Predios con componente (C3) ===");
const prediosC3 = await sql`
  SELECT count(DISTINCT pp.id_predio)::int AS predios_c3
  FROM sgs_pro_propuesta pp
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  WHERE c.nombre = 'C3' AND pp.id_predio IS NOT NULL
`;
console.log(`Predios en C3: ${prediosC3[0].predios_c3}`);

console.log("\n=== 7. Municipios intervenidos ===");
const munInt = await sql`
  SELECT count(DISTINCT m.id_municipio)::int AS n
  FROM sgs_pro_propuesta pp
  JOIN sgs_pre_predio p ON p.id_predio = pp.id_predio
  JOIN bcs_lpa_vereda v ON v.id_vereda = p.id_vereda
  JOIN bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
  WHERE pp.id_predio IS NOT NULL
`;
console.log(`Municipios con al menos 1 propuesta: ${munInt[0].n}`);

await sql.end();
