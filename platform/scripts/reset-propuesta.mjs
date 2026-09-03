import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, {max:1, onnotice:()=>{}});
await sql`TRUNCATE sgs_pro_propuesta_punto, sgs_pro_propuesta_linea, sgs_pro_propuesta_poligono, sgs_pro_propuesta, sgs_com_accion, sgs_com_componente RESTART IDENTITY CASCADE`;
console.log("Truncado: propuesta_* + componentes/acciones");
await sql.end({timeout:1});
