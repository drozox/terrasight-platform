// =============================================================================
// DEBT-3.2 — Smoke test E2E de las 14 rutas críticas con sesión real.
//
// CONTEXTO: el audit inicial (12 commits, 14/14 build verde) NO detectó
// 3 bugs de runtime que solo aparecen cuando la BD responde:
//
//   1. /analisis   — `SUM(DISTINCT ON ())` no es SQL estándar → 500
//   2. /monitoreo  — `leaflet` se importa en SSR → `window is not defined`
//   3. /reportes   — `<Button onClick={...}>` en Server Component → 500
//
// `tsc --noEmit`, `next build` y `npm test` (156 unit) no atrapan estos
// bugs porque ninguno ejecuta SQL ni renderiza páginas autenticadas.
// Este test usa la API `request` de Playwright con login real via
// NextAuth v5 (CSRF + callback/credentials + cookie session-token).
//
// EJECUCIÓN:
//   # 1. BD prendida (npm run db:up) + dev server (npm run dev en :3001)
//   npx playwright test tests/e2e/smoke-routes.spec.ts
//
// Si el dev server está en otro puerto, sobreescribir con PLAYWRIGHT_BASE_URL.
// =============================================================================

import { test, expect, type APIRequestContext } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";
const ADMIN_EMAIL = "admin@car.gov.co";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin123!";

// --------------------------------------------------------------------
// /login — DEBT-3.3 (siguiendo el hilo de DEBT-3.2): sin sesión, el
// layout NO debe renderizar sidebar ni topbar. Solo el form centrado.
// --------------------------------------------------------------------
test.describe("DEBT-3.3 — Layout condicional en /login", () => {
  test("GET /login sin sesión renderiza SOLO el form (sin sidebar)", async ({ request }) => {
    const r = await request.get("/login", { failOnStatusCode: false });
    expect(r.status()).toBe(200);
    const body = await r.text();
    // El sidebar contiene estos items; el layout condicional debe haberlo
    // ocultado por completo.
    expect(body, "no debe haber item de sidebar 'Inicio'").not.toMatch(/>Inicio</);
    expect(body, "no debe haber item de sidebar 'Mapa 2D'").not.toMatch(/Mapa 2D/);
    expect(body, "no debe haber item de sidebar 'Dashboard'").not.toMatch(/Dashboard</);
    expect(body, "no debe haber item de sidebar 'Reportes'").not.toMatch(/>Reportes</);
    // El form SÍ debe estar
    expect(body).toMatch(/Iniciar sesión/);
    expect(body).toMatch(/Correo electr[oó]nico/);
    expect(body).toMatch(/Contrase[ñn]a/);
  });

  test("GET /dashboard sin sesión redirige a /login (middleware)", async ({ request }) => {
    const r = await request.get("/dashboard", { maxRedirects: 0, failOnStatusCode: false });
    expect([302, 307]).toContain(r.status());
    expect(r.headers().location).toMatch(/\/login/);
  });
});

// --------------------------------------------------------------------
// /login — DEBT-3.4: CSS computado. Antes del fix, max-w-md se computaba
// como 12px (porque --spacing-md estaba redefinido a 0.75rem y Tailwind
// v4 lo usaba como fallback para max-w-{md,lg,sm}). El test verifica
// que las utilities críticas de Tailwind renderizan con su valor real.
// Sin este test, el bug visual de "form colapsado a 1 char de ancho"
// pasaba el status 200 + no-digest pero rompía la UI.
// --------------------------------------------------------------------
test.describe("DEBT-3.4 — CSS computed (Tailwind v4 spacing)", () => {
  test("/login: max-w-md renderiza como 448px (no 12px)", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    // El card de login usa <main> > <div> con className="w-full max-w-md ...".
    const card = page.locator("main > div").first();
    await card.waitFor({ state: "attached" });
    const maxWidth = await card.evaluate((el) => getComputedStyle(el).maxWidth);
    // 28rem = 448px a 16px base. Antes del fix era 12px (var(--spacing-md)).
    expect(maxWidth, "max-w-md debe computar como 448px, no como 12px").toBe("448px");
    const width = await card.evaluate((el) => el.getBoundingClientRect().width);
    expect(width, "el card debe tener ancho visible, no colapsado").toBeGreaterThan(200);
  });

  test("/login: inputs tienen w-full (ancho completo del card)", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const email = page.locator('input[name="email"]');
    await email.waitFor({ state: "attached" });
    const w = await email.evaluate((el) => el.getBoundingClientRect().width);
    expect(w, "input email debe tener ancho visible (>=200px)").toBeGreaterThan(200);
  });
});

async function loginAsAdmin(request: APIRequestContext): Promise<void> {
  // NextAuth v5: CSRF + callback/credentials con form-urlencoded
  const csrfResp = await request.get("/api/auth/csrf");
  expect(csrfResp.ok()).toBeTruthy();
  const { csrfToken } = (await csrfResp.json()) as { csrfToken: string };

  const loginResp = await request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      redirect: "false",
      json: "true",
    },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  // 302 = login OK, 401 = password incorrecto, 200 con error en body
  expect(loginResp.status(), "login falló (¿admin sembrado?)").toBe(302);

  // Sanity: la sesión existe
  const sessionResp = await request.get("/api/auth/session");
  expect(sessionResp.ok()).toBeTruthy();
  const session = (await sessionResp.json()) as { user?: { email: string } };
  expect(session.user?.email).toBe(ADMIN_EMAIL);
}

// --------------------------------------------------------------------
// /analisis — DEBT-3.2 bug 1: SUM(DISTINCT ON ()) no es SQL estándar
// --------------------------------------------------------------------
test.describe("DEBT-3.2 — Runtime smoke /analisis", () => {
  test("GET /analisis con sesión ADMIN responde 200 y no contiene 'syntax error'", async ({
    request,
  }) => {
    await loginAsAdmin(request);
    const r = await request.get("/analisis", { failOnStatusCode: false });
    expect(r.status(), "GET /analisis").toBe(200);
    const body = await r.text();
    expect(body, "no debe haber 'syntax error' en el HTML").not.toMatch(/syntax error/i);
    // Heading del módulo
    expect(body).toMatch(/An.lisis|Análisis|Componente/i);
  });

  test("GET /api/analisis/buffer con target inválido devuelve 400 (no 500)", async ({
    request,
  }) => {
    await loginAsAdmin(request);
    const r = await request.post("/api/analisis/buffer", {
      data: { tipo: "invalido", id: 1, distanciaM: 1000 },
      failOnStatusCode: false,
    });
    expect([400, 401]).toContain(r.status());
  });
});

// --------------------------------------------------------------------
// /monitoreo — DEBT-3.2 bug 2: Leaflet SSR (window is not defined)
// --------------------------------------------------------------------
test.describe("DEBT-3.2 — Runtime smoke /monitoreo", () => {
  test("GET /monitoreo con sesión ADMIN responde 200 sin 'window is not defined'", async ({
    request,
  }) => {
    await loginAsAdmin(request);
    const r = await request.get("/monitoreo", { failOnStatusCode: false });
    expect(r.status(), "GET /monitoreo").toBe(200);
    const body = await r.text();
    expect(body, "no debe haber 'window is not defined'").not.toMatch(/window is not defined/i);
    expect(body, "no debe haber 'digest' de error").not.toMatch(/"digest":\s*"\d+"/);
    expect(body).toMatch(/Monitoreo/);
  });
});

// --------------------------------------------------------------------
// /reportes — DEBT-3.2 bug 3: onClick en Server Component
// --------------------------------------------------------------------
test.describe("DEBT-3.2 — Runtime smoke /reportes", () => {
  test("GET /reportes con sesión ADMIN/ANALISTA responde 200 sin 'Event handlers'", async ({
    request,
  }) => {
    await loginAsAdmin(request);
    const r = await request.get("/reportes", { failOnStatusCode: false });
    expect(r.status(), "GET /reportes").toBe(200);
    const body = await r.text();
    expect(body, "no debe haber 'Event handlers cannot be passed'").not.toMatch(
      /Event handlers cannot be passed/i,
    );
    expect(body, "no debe haber 'digest' de error").not.toMatch(/"digest":\s*"\d+"/);
    expect(body).toMatch(/Reportes/);
  });

  test("GET /api/reportes?tipo=R4 con sesión devuelve CSV con header de Avance", async ({
    request,
  }) => {
    await loginAsAdmin(request);
    const r = await request.get("/api/reportes?tipo=R4", { failOnStatusCode: false });
    expect(r.status()).toBe(200);
    const body = await r.text();
    // CSV con BOM + separador ; (Excel-es)
    expect(body).toMatch(/Avance/i);
  });
});

// --------------------------------------------------------------------
// Cobertura cruzada — todas las rutas con sesión deben ser 200
// --------------------------------------------------------------------
test.describe("DEBT-3.2 — Runtime smoke 14 rutas (con sesión)", () => {
  const rutas = [
    { path: "/",                  expect: /Cundinamarca|TerraSight/i },
    { path: "/dashboard",         expect: null },
    { path: "/intervenciones",    expect: null },
    { path: "/mapa",              expect: /mapa|Leaflet/i },
    { path: "/alertas",           expect: null },
    { path: "/reportes",          expect: /Reportes/ },
    { path: "/analisis",          expect: null },
    { path: "/predios",           expect: null },
    { path: "/monitoreo",         expect: /Monitoreo/ },
    { path: "/quebradas",         expect: null },
    { path: "/catalogos",         expect: null },
    { path: "/admin/auditoria",   expect: /Auditor/i },
    { path: "/admin/usuarios",    expect: null },
    { path: "/configuracion",     expect: null },
  ];

  for (const { path, expect: matcher } of rutas) {
    test(`GET ${path} con sesión ADMIN → 200`, async ({ request }) => {
      await loginAsAdmin(request);
      const r = await request.get(path, { failOnStatusCode: false });
      expect(r.status(), `GET ${path}`).toBe(200);
      const body = await r.text();
      expect(body, `${path}: no debe tener 'digest' de error`).not.toMatch(/"digest":\s*"\d+"/);
      if (matcher) {
        expect(body, `${path}: debe contener el patrón`).toMatch(matcher);
      }
    });
  }
});
