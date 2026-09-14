// =============================================================================
// tests/e2e/predio-detalle.spec.ts — DEEPSEEK-74
//
// E2E que blinda /predios/[id] (no debe dar 500 y debe mostrar la ficha).
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

test.describe("DEEPSEEK-74 — /predios/[id] ficha de predio", () => {
  test("GET /predios con sesión → 200 y contiene 'Predios'", async ({ request }) => {
    await loginAsAdmin(request);
    const r = await request.get("/predios", { failOnStatusCode: false });
    expect(r.status(), "GET /predios").toBe(200);

    const body = await r.text();
    // No debe haber error de runtime
    expect(body, "no debe haber 'digest' de error").not.toMatch(/"digest":\s*"\d+"/);

    // Heading principal
    expect(body, "/predios debe contener 'Predios'").toMatch(/Predios/);
  });

  test("GET /predios/1 con sesión → 200 o 404 (NO 500)", async ({ request }) => {
    await loginAsAdmin(request);
    const r = await request.get("/predios/1", { failOnStatusCode: false });
    // El id 1 puede o no existir → status aceptable: existe (200) o no (404).
    expect([200, 404], "el detalle no debe devolver 500").toContain(r.status());

    const body = await r.text();
    // No debe haber error de runtime
    expect(body, "no debe haber 'digest' de error").not.toMatch(/"digest":\s*"\d+"/);

    if (r.status() === 200) {
      // Si la ficha existe, debe mostrar cédula/propietario/área.
      expect(body, "ficha debe contener 'Cédula' o 'Propietario'").toMatch(
        /C[eé]dula|Propietario|[Aa]rea/,
      );
    }
  });
});
