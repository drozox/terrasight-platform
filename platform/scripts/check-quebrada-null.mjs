import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, {max:1, onnotice:()=>{}});
const r = await sql`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'sgs_pro_propuesta' AND column_name = 'id_quebrada'`;
console.log('sgs_pro_propuesta.id_quebrada:', r[0]?.is_nullable);
const r2 = await sql`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'sgs_pro_propuesta_punto' AND column_name = 'id_quebrada'`;
console.log('sgs_pro_propuesta_punto.id_quebrada:', r2[0]?.is_nullable);
await sql.end({timeout:1});
