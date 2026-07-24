// Screenshot audit script — captures login + dashboard + mapa for UI/UX review
// Uses NextAuth v5 CSRF flow via request API to avoid the cloudflared-tunnel
// NEXTAUTH_URL redirect (login form posts to a public domain, not localhost).
// Usage: node scripts/audit-screenshot.mjs
import { chromium, request as pwRequest } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const OUT = join(process.cwd(), "docs", "ui-ux-screenshots");
mkdirSync(OUT, { recursive: true });

const PAGES = [
  { name: "01-login",           path: "/login",        needAuth: false },
  { name: "02-dashboard",       path: "/",             needAuth: true },
  { name: "03-mapa",            path: "/mapa",         needAuth: true },
  { name: "04-predios",         path: "/predios",      needAuth: true },
  { name: "05-intervenciones",  path: "/intervenciones", needAuth: true },
  { name: "06-monitoreo",       path: "/monitoreo",    needAuth: true },
  { name: "07-analisis",        path: "/analisis",     needAuth: true },
  { name: "08-alertas",         path: "/alertas",      needAuth: true },
  { name: "09-reportes",        path: "/reportes",     needAuth: true },
  { name: "10-catalogos",       path: "/catalogos",    needAuth: true },
  { name: "11-configuracion",   path: "/configuracion", needAuth: true },
  { name: "12-404",             path: "/no-existe",    needAuth: false },
];

const ADMIN_EMAIL = "admin@car.gov.co";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin123!";

async function loginAsAdmin(ctx) {
  const req = await pwRequest.newContext({ baseURL: BASE, storageState: undefined });
  const csrf = (await (await req.get("/api/auth/csrf")).json()).csrfToken;
  const r = await req.post("/api/auth/callback/credentials", {
    form: {
      csrfToken: csrf,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      redirect: "false",
      json: "true",
    },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  if (r.status() !== 302) throw new Error(`login failed: ${r.status()}`);
  const cookies = await req.storageState();
  await req.dispose();
  await ctx.addCookies(cookies.cookies);
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "es-CO",
  });
  const page = await ctx.newPage();

  // 01. Login (no auth)
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: join(OUT, "01-login.png"), fullPage: false });
  console.log("  ✓ 01-login");

  // Login for the rest
  await loginAsAdmin(ctx);

  for (const p of PAGES.slice(1)) {
    try {
      await page.goto(`${BASE}${p.path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500); // let charts/maps settle
      await page.screenshot({ path: join(OUT, `${p.name}.png`), fullPage: false });
      console.log(`  ✓ ${p.name} ${p.path}`);
    } catch (e) {
      console.log(`  ✗ ${p.name} ${p.path}: ${e.message.split("\n")[0]}`);
    }
  }

  await browser.close();
  console.log(`\nScreenshots saved to: ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
