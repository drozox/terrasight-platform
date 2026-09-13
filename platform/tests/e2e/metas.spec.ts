// =============================================================================
// tests/e2e/metas.spec.ts — DEEPSEEK-11
//
// E2E que blinda la zona que causó el bug P1-3 (filtro de acción mal armado
// en el drill-down de /metas/convenio/propuestas):
//
//   - /metas/convenio            → 200 + body contiene "Metas del convenio" y "Cercos vivos"
//   - /metas/convenio/propuestas?indicador=cercos_vivos
//                                → 200 + body NO contiene "No hay propuestas registradas"
//                                  (ese texto era la señal del bug P1-3 cuando el
//                                   drill-down devolvía 0 filas)
//
// Patrón de login copiado de tests/e2e/smoke-routes.spec.ts:
//   - CSRF + callback/credentials (NextAuth v5)
//   - ADMIN_EMAIL + ADMIN_PASSWORD desde env
//   - failOnStatusCode: false (assert manual del status)
//
// EJECUCIÓN (en CI con BD + dev server):
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

test.describe("DEEPSEEK-11 — /metas/convenio + drill-down (regresión P1-3)", () => {
  test("GET /metas/convenio con sesión → 200 y contiene Metas del convenio + Cercos vivos", async ({
    request,
  }) => {
    await loginAsAdmin(request);
    const r = await request.get("/metas/convenio", { failOnStatusCode: false });
    expect(r.status(), "GET /metas/convenio").toBe(200);
    const body = await r.text();

    // No debe haber error de runtime
    expect(body, "no debe haber 'digest' de error").not.toMatch(/"digest":\s*"\d+"/);

    // Heading principal
    expect(body, "/metas/convenio debe contener el título").toMatch(/Metas del convenio/);

    // Indicador de Cercos vivos (C1A1) debe estar en la tabla
    expect(body, "/metas/convenio debe listar 'Cercos vivos' (C1A1)").toMatch(/Cercos vivos/);
  });

  test("GET /metas/convenio/propuestas?indicador=cercos_vivos con sesión → 200 y drill-down NO está vacío", async ({
    request,
  }) => {
    await loginAsAdmin(request);
    const r = await request.get(
      "/metas/convenio/propuestas?indicador=cercos_vivos",
      { failOnStatusCode: false },
    );
    expect(r.status(), "GET drill-down").toBe(200);
    const body = await r.text();

    // No debe haber error de runtime
    expect(body, "no debe haber 'digest' de error").not.toMatch(/"digest":\s*"\d+"/);

    // BUG P1-3: cuando el filtro de acción estaba mal armado (substring(2,3)
    // en lugar de substring(2,4)), el drill-down devolvía 0 filas y la UI
    // mostraba "No hay propuestas registradas para este indicador".
    // Si ese texto aparece, el bug P1-3 está de vuelta.
    expect(
      body,
      "drill-down no debe mostrar 'No hay propuestas registradas' (bug P1-3)",
    ).not.toMatch(/No hay propuestas registradas/);

    // El drill-down debe tener breadcrumbs / heading coherente
    expect(body, "drill-down debe tener breadcrumbs o título de indicador").toMatch(
      /Cercos vivos|Metas del convenio/,
    );
  });
});
