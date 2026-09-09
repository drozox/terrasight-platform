import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
import postgres from "postgres";
const s = postgres(process.env.DATABASE_URL, { max: 1 });
const r = await s`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name LIKE 'bcs%'
  ORDER BY table_name
`;
console.log(r.map((x) => x.table_name).join("\n"));
await s.end();
