import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
import postgres from "postgres";
const s = postgres(process.env.DATABASE_URL, { max: 1 });
const r = await s`SELECT count(*)::int AS n FROM sgs_pro_estado_historial`;
console.log("Historial total:", r[0].n);
const sample = await s`
  SELECT id_propuesta, estado_anterior, estado_nuevo, usuario, rol, comentario, created_at
  FROM sgs_pro_estado_historial
  ORDER BY id_historial DESC
  LIMIT 3
`;
console.log("Últimas 3:");
for (const row of sample) console.log("  ", JSON.stringify(row));
await s.end();
