import postgres from "postgres";
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 2 });

const r = await sql`
  SELECT
    (SELECT count(DISTINCT id_predio) FROM sgs_pro_propuesta WHERE id_predio IS NOT NULL) AS super,
    (SELECT count(*) FROM sgs_pre_predio) AS total
`;
console.log("Counts:", r[0]);
console.log("super <= total:", r[0].super <= r[0].total);

const v = await sql`SELECT count(*)::int AS n FROM pg_views WHERE schemaname='public' AND viewname LIKE 'sgs_v_metas%'`;
console.log("Vistas metas:", v[0]);

await sql.end();
