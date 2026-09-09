import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
import postgres from "postgres";
const s = postgres(process.env.DATABASE_URL, { max: 1 });
const r = await s`
  SELECT estado, count(*)::int AS n
  FROM sgs_pro_propuesta
  GROUP BY estado
  ORDER BY n DESC
`;
console.log(r.map((x) => `${x.estado}: ${x.n}`).join("\n"));
await s.end();
