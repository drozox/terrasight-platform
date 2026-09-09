import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
import postgres from "postgres";
const s = postgres(process.env.DATABASE_URL, { max: 1 });
const r = await s`
  SELECT id_error, fila, columna, valor, mensaje
  FROM sgs_adm_importacion_error
  WHERE id_importacion = 4
  ORDER BY id_error
`;
console.log(JSON.stringify(r, null, 2));
await s.end();
