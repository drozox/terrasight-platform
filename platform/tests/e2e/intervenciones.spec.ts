// =============================================================================
// tests/e2e/intervenciones.spec.ts — DEEPSEEK-40
//
// E2E que blinda el módulo de intervenciones (lista + ficha con WorkflowPanel).
// Verifica que ambas rutas renderizan con sesión sin 500.
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

test.describe("DEEPSEEK-40 — /intervenciones list + detalle", () => {
  test("GET /intervenciones con sesión → 200 y contiene 'Intervenciones'", async ({
    request,
  }) => {
    await loginAsAdmin(request);
    const r = await request.get("/intervenciones", { failOnStatusCode: false });
    expect(r.status(), "GET /intervenciones").toBe(200);

    const body = await r.text();
    // No debe haber error de runtime
    expect(body, "no debe haber 'digest' de error").not.toMatch(/"digest":\s*"\d+"/);

    // Heading principal
    expect(body, "/intervenciones debe contener 'Intervenciones'").toMatch(/Intervenciones/);
  });

  test("GET /intervenciones/1 con sesión → 200 o 404 (NO 500)", async ({ request }) => {
    await loginAsAdmin(request);
    const r = await request.get("/intervenciones/1", { failOnStatusCode: false });
    // Status aceptable: existe (200) o no existe (404), pero NUNCA 500.
    expect([200, 404], "el detalle no debe devolver 500").toContain(r.status());

    const body = await r.text();
    // No debe haber error de runtime
    expect(body, "no debe haber 'digest' de error").not.toMatch(/"digest":\s*"\d+"/);

    if (r.status() === 200) {
      // Si la ficha existe, debe mostrar Estado / Workflow.
      expect(body, "ficha debe contener 'Estado' o 'Workflow'").toMatch(
        /Estado|Workflow/i,
      );
    }
  });
});
