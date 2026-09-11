// Verifica conteos de super vs hijas
import postgres from "postgres";
const url = process.env.DATABASE_URL
  ?? "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf";
const sql = postgres(url, { max: 1, prepare: false });

(async () => {
  const s = await sql`SELECT count(*)::int AS n FROM sgs_pro_propuesta`;
  console.log("Total super-propuestas:", s[0].n);
  const l = await sql`SELECT count(*)::int AS n FROM sgs_pro_propuesta_linea`;
  console.log("Total lineas:", l[0].n);
  const p = await sql`SELECT count(*)::int AS n FROM sgs_pro_propuesta_poligono`;
  console.log("Total poligonos:", p[0].n);
  const pt = await sql`SELECT count(*)::int AS n FROM sgs_pro_propuesta_punto`;
  console.log("Total puntos:", pt[0].n);
  const conHijas = await sql`
    SELECT count(DISTINCT pp.id_propuesta)::int AS super_con_hija
    FROM sgs_pro_propuesta pp
    WHERE EXISTS (SELECT 1 FROM sgs_pro_propuesta_punto pt WHERE pt.id_propuesta = pp.id_propuesta)
       OR EXISTS (SELECT 1 FROM sgs_pro_propuesta_linea pl WHERE pl.id_propuesta = pp.id_propuesta)
       OR EXISTS (SELECT 1 FROM sgs_pro_propuesta_poligono pq WHERE pq.id_propuesta = pp.id_propuesta)
  `;
  console.log("Super-propuestas con al menos 1 hija:", conHijas[0].super_con_hija);
  const sinHijas = await sql`
    SELECT count(*)::int AS sin_hija
    FROM sgs_pro_propuesta pp
    WHERE NOT EXISTS (SELECT 1 FROM sgs_pro_propuesta_punto pt WHERE pt.id_propuesta = pp.id_propuesta)
      AND NOT EXISTS (SELECT 1 FROM sgs_pro_propuesta_linea pl WHERE pl.id_propuesta = pp.id_propuesta)
      AND NOT EXISTS (SELECT 1 FROM sgs_pro_propuesta_poligono pq WHERE pq.id_propuesta = pp.id_propuesta)
  `;
  console.log("Super-propuestas SIN hija:", sinHijas[0].sin_hija);

  // Las 692 puntos -> cuantos super-propuestas únicas?
  const uniqSupers = await sql`
    SELECT count(DISTINCT id_propuesta)::int AS n FROM sgs_pro_propuesta_punto
  `;
  console.log("Super-propuestas únicas representadas por los 692 puntos:", uniqSupers[0].n);
  await sql.end();
})().catch(e => { console.error(e); process.exit(1); });
