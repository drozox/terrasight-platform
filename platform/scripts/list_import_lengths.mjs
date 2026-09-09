import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
import postgres from "postgres";
const s = postgres(process.env.DATABASE_URL, { max: 1 });
const r = await s`
  SELECT column_name, character_maximum_length
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name IN ('sgs_adm_importacion', 'sgs_pre_predio')
  ORDER BY table_name, ordinal_position
`;
for (const row of r) console.log(`${row.column_name}: ${row.character_maximum_length ?? "text"}`);
await s.end();
