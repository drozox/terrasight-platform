// =============================================================================
// tests/e2e/api-data.spec.ts — DEEPSEEK-54
//
// E2E con sesión de dos endpoints de datos:
//   - GET /api/reportes?tipo=R1 → CSV (;separador, Excel-es)
//   - GET /api/metas/snapshots  → { snapshots: [...] }
//
// Patrón de login copiado de tests/e2e/smoke-routes.spec.ts:
//   - CSRF + callback/credentials (NextAuth v5)
//   - ADMIN_EMAIL + ADMIN_PASSWORD desde env
//   - failOnStatusCode: false (assert manual del status)
//
// EJECUCIÓN (CI con BD + dev server):
//   npm run test:e2e
// =============================================================================

import { test, expect, type APIRequestContext } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";
const ADMIN_EMAIL = "admin@car.gov.co";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin123!";

async function loginAsAdmin(request: APIRequestContext): Promise<void> {
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
  expect(loginResp.status(), "login falló (¿admin sembrado?)").toBe(302);

  // Sanity: la sesión existe
  const sessionResp = await request.get("/api/auth/session");
  expect(sessionResp.ok()).toBeTruthy();
  const session = (await sessionResp.json()) as { user?: { email: string } };
  expect(session.user?.email).toBe(ADMIN_EMAIL);
}

test.describe("DEEPSEEK-54 — endpoints de datos (CSV + snapshots)", () => {
  test("GET /api/reportes?tipo=R1 con sesión → 200 text/csv con separador ';'", async ({
    request,
  }) => {
    await loginAsAdmin(request);
    const r = await request.get("/api/reportes?tipo=R1", { failOnStatusCode: false });
    expect(r.status(), "GET /api/reportes?tipo=R1").toBe(200);

    // Content-Type: text/csv (o text/csv; charset=utf-8)
    const ct = r.headers()["content-type"] ?? "";
    expect(ct, "content-type debe contener text/csv").toContain("text/csv");

    const body = await r.text();
    // CSV con separador ; (Excel-es) — el primer separador debe ser ;
    expect(body, "body debe contener ';' como separador CSV").toContain(";");
  });

  test("GET /api/metas/snapshots con sesión → 200 con snapshots[]", async ({
    request,
  }) => {
    await loginAsAdmin(request);
    const r = await request.get("/api/metas/snapshots", { failOnStatusCode: false });
    expect(r.status(), "GET /api/metas/snapshots").toBe(200);

    const data = (await r.json()) as { snapshots?: unknown };
    expect(data, "response debe tener clave 'snapshots'").toHaveProperty("snapshots");
    expect(Array.isArray(data.snapshots), "'snapshots' debe ser array").toBe(true);
    // Puede estar vacío si nadie creó snapshot todavía.
  });
});
