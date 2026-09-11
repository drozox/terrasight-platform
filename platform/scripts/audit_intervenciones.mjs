// Verifica si hay propuestas tipo-punto sin id_predio (excluidas de IntervencionesRecientes)
import postgres from "postgres";
const url = process.env.DATABASE_URL
  ?? "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf";
const sql = postgres(url, { max: 1, prepare: false });

(async () => {
  // Propuestas SIN id_predio
  const sinPredio = await sql`
    SELECT count(*)::int AS n FROM sgs_pro_propuesta WHERE id_predio IS NULL
  `;
  console.log("Propuestas SIN id_predio:", sinPredio[0].n);

  // Propuestas tipo punto SIN id_predio
  const puntoSinPredio = await sql`
    SELECT count(*)::int AS n
    FROM sgs_pro_propuesta pp
    WHERE pp.id_predio IS NULL
      AND EXISTS (SELECT 1 FROM sgs_pro_propuesta_punto pt WHERE pt.id_propuesta = pp.id_propuesta)
  `;
  console.log("Puntos SIN id_predio (excluidos de IntervencionesRecientes):", puntoSinPredio[0].n);

  // Cuántas se muestran en IntervencionesRecientes para C2 (con filtro)
  const c2 = await sql`
    SELECT pp.id_propuesta, pp.actividad
    FROM sgs_pro_propuesta pp
    JOIN sgs_pre_predio pr ON pr.id_predio = pp.id_predio
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C2'
    ORDER BY pp.id_propuesta ASC
    LIMIT 8
  `;
  console.log("\nIntervencionesRecientes (filtro C2) — primeras 8:");
  for (const r of c2) console.log(`  id=${r.id_propuesta} actividad="${r.actividad}"`);

  // C2 totales que matchean el query actual (con id_predio)
  const c2ConPredio = await sql`
    SELECT count(*)::int AS n
    FROM sgs_pro_propuesta pp
    JOIN sgs_pre_predio pr ON pr.id_predio = pp.id_predio
    JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C2'
  `;
  console.log(`\nTotal C2 que SÍ aparecen en IntervencionesRecientes: ${c2ConPredio[0].n}`);
  console.log(`Total C2 con hijo tipo-punto en DB: 259 (158 CC2AA1 + 101 CC2AA2)`);

  await sql.end();
})().catch(e => { console.error(e); process.exit(1); });
