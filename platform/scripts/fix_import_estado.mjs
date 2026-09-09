import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
import postgres from "postgres";
const s = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  await s`ALTER TABLE sgs_adm_importacion ALTER COLUMN estado TYPE VARCHAR(32)`;
  console.log("✓ Column altered");
} catch (err) {
  console.error("Error:", err.message);
} finally {
  await s.end();
}
