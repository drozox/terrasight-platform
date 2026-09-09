// Test E2E del endpoint de importacion.
// Crea sesion via NextAuth credentials, sube un CSV de 3 predios (1 con error).
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const BASE = "http://localhost:3000";
const cookieJar = [];
const cookieFile = process.env.TEMP + "/imp_cookies.txt";

const fetchWithCookies = async (url, opts = {}) => {
  const headers = { ...(opts.headers ?? {}) };
  if (cookieJar.length) headers["Cookie"] = cookieJar.join("; ");
  const r = await fetch(url, { ...opts, headers });
  const setCookies = r.headers.getSetCookie?.() ?? [];
  for (const sc of setCookies) {
    const [pair] = sc.split(";");
    const [name, val] = pair.split("=");
    const idx = cookieJar.findIndex((c) => c.startsWith(name + "="));
    if (idx >= 0) cookieJar[idx] = `${name}=${val}`;
    else cookieJar.push(`${name}=${val}`);
  }
  return r;
};

const csrfRes = await fetchWithCookies(BASE + "/api/auth/csrf");
const { csrfToken } = await csrfRes.json();

const loginBody = new URLSearchParams({
  email: "admin@sig-territorio.local",
  password: "AdminTest123!",
  csrfToken,
  callbackUrl: BASE + "/",
  json: "true",
});
const loginRes = await fetchWithCookies(BASE + "/api/auth/callback/credentials", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: loginBody,
  redirect: "manual",
});
console.log("Login status:", loginRes.status);

const csvText = `nombre_predio;area_ha;id_vereda;id_propietario
"Predio A";12.5;5;3
"Predio B";abc;5;3
"Predio C";8.0;5;3`;

const importRes = await fetchWithCookies(BASE + "/api/importaciones", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tipo_entidad: "predio",
    nombre_archivo: "test-2026-09-08.csv",
    csv_text: csvText,
    comentario: "Test E2E",
  }),
});
const importData = await importRes.json();
console.log("Import status:", importRes.status);
console.log("Import result:", importData);
