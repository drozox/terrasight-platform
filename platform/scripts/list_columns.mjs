import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
import postgres from "postgres";
const s = postgres(process.env.DATABASE_URL, { max: 1 });
const tableName = process.argv[2] || "sgs_pro_propuesta";
const r = await s`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema='public' AND table_name=${tableName}
  ORDER BY ordinal_position
`;
console.log(r.map((x) => `${x.column_name} (${x.data_type})`).join("\n"));
await s.end();
