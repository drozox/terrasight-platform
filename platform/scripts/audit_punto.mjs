// Auditoría rápida: conteos de sgs_pro_propuesta_punto por C/A
import postgres from "postgres";
const url = process.env.DATABASE_URL
  ?? "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf";
const sql = postgres(url, { max: 1, prepare: false });

(async () => {
  console.log("=== 1. Conteos en sgs_pro_propuesta_punto ===");
  const total = await sql`SELECT count(*)::int AS total FROM sgs_pro_propuesta_punto`;
  console.log("  Total:", total[0].total);

  const byCA = await sql`
    SELECT c.nombre AS componente, a.nombre AS accion, count(*)::int AS n
    FROM sgs_pro_propuesta_punto pt
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    GROUP BY c.nombre, a.nombre
    ORDER BY c.nombre, a.nombre
  `;
  console.log("  Por C/A:");
  for (const r of byCA) console.log(`    C${r.componente}A${r.accion}: ${r.n}`);

  const noCA = await sql`
    SELECT count(*)::int AS n
    FROM sgs_pro_propuesta_punto pt
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
    LEFT JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    LEFT JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre IS NULL OR a.nombre IS NULL
  `;
  console.log("  Sin C/A (huérfanos):", noCA[0].n);

  // Por estado
  console.log("\n=== 2. Por estado ===");
  const byEstado = await sql`
    SELECT pp.estado, count(*)::int AS n
    FROM sgs_pro_propuesta_punto pt
    JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
    GROUP BY pp.estado
    ORDER BY pp.estado
  `;
  for (const r of byEstado) console.log(`  ${r.estado}: ${r.n}`);

  // Actividad más común
  console.log("\n=== 3. Top 10 actividades (sin unaccent) ===");
  const top = await sql`
    SELECT pt.actividad, count(*)::int AS n
    FROM sgs_pro_propuesta_punto pt
    GROUP BY pt.actividad
    ORDER BY n DESC
    LIMIT 10
  `;
  for (const r of top) console.log(`  ${r.n.toString().padStart(4)} - ${r.actividad}`);

  // Cobertura por tipo_actividad (clasificación de indicadores)
  console.log("\n=== 4. Cobertura por patrón de indicador ===");
  const cov = await sql`
    SELECT
      SUM(CASE WHEN unaccent(pt.actividad) ILIKE unaccent('%cosecha%') THEN 1 ELSE 0 END)::int AS cosecha,
      SUM(CASE WHEN unaccent(pt.actividad) ILIKE unaccent('%compostaje%')
                  OR unaccent(pt.actividad) ILIKE unaccent('%compost%') THEN 1 ELSE 0 END)::int AS compostaje,
      SUM(CASE WHEN unaccent(pt.actividad) ILIKE unaccent('%estacion%limnimet%')
                  OR unaccent(pt.actividad) ILIKE unaccent('%limnimet%') THEN 1 ELSE 0 END)::int AS estaciones,
      SUM(CASE WHEN unaccent(pt.actividad) ILIKE unaccent('%captacion%')
                  OR unaccent(pt.actividad) ILIKE unaccent('%captaci%') THEN 1 ELSE 0 END)::int AS obras
    FROM sgs_pro_propuesta_punto pt
  `;
  console.log(`  cosecha=${cov[0].cosecha} compostaje=${cov[0].compostaje} estaciones=${cov[0].estaciones} obras=${cov[0].obras}`);

  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
