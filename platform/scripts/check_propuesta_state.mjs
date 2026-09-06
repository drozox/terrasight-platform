import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

const c = await sql`
  SELECT
    (SELECT count(*)::int FROM sgs_pro_propuesta) AS super,
    (SELECT count(*)::int FROM sgs_pro_propuesta_punto) AS punto,
    (SELECT count(*)::int FROM sgs_pro_propuesta_linea) AS linea,
    (SELECT count(*)::int FROM sgs_pro_propuesta_poligono) AS poligono,
    (SELECT count(*)::int FROM sgs_pro_propuesta_punto WHERE id_propuesta IS NOT NULL) AS punto_con_super,
    (SELECT count(*)::int FROM sgs_pro_propuesta_linea WHERE id_propuesta IS NOT NULL) AS linea_con_super,
    (SELECT count(*)::int FROM sgs_pro_propuesta_poligono WHERE id_propuesta IS NOT NULL) AS poligono_con_super
`;
console.log("Propuesta state:", c[0]);
await sql.end();
