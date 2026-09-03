import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, {max:1, onnotice:()=>{}});
const r = await sql`
  SELECT
    (SELECT count(*)::int FROM sgs_com_componente) AS comp,
    (SELECT count(*)::int FROM sgs_com_accion) AS acc,
    (SELECT count(*)::int FROM sgs_pro_propuesta) AS sup,
    (SELECT count(*)::int FROM sgs_pro_propuesta_punto) AS pt,
    (SELECT count(*)::int FROM sgs_pro_propuesta_linea) AS ln,
    (SELECT count(*)::int FROM sgs_pro_propuesta_poligono) AS pg
`;
console.log("comp:", r[0].comp, "acc:", r[0].acc, "sup:", r[0].sup, "pt:", r[0].pt, "ln:", r[0].ln, "pg:", r[0].pg);
await sql.end({timeout:1});
