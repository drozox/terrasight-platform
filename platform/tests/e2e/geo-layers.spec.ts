// =============================================================================
// tests/e2e/geo-layers.spec.ts — DEEPSEEK-70
//
// E2E que blinda las capas nuevas de /api/geo:
//   - propuestas_punto (los puntos de C2 ya tienen geometría)
//   - propuestas_poligono (las áreas/áreas)
//   - predios (polígonos)
//
// Patrón de login copiado de tests/e2e/api-data.spec.ts:
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

test.describe("DEEPSEEK-70 — /api/geo capas (propuestas_punto / propuestas_poligono / predios)", () => {
  test("GET /api/geo?layer=propuestas_punto → 200 + FeatureCollection con >0 features", async ({
    request,
  }) => {
    await loginAsAdmin(request);
    const r = await request.get("/api/geo?layer=propuestas_punto", {
      failOnStatusCode: false,
    });
    expect(r.status(), "GET /api/geo?layer=propuestas_punto").toBe(200);

    const data = (await r.json()) as {
      type?: string;
      features?: Array<unknown>;
    };
    expect(data.type, "type debe ser 'FeatureCollection'").toBe("FeatureCollection");
    expect(Array.isArray(data.features), "features debe ser array").toBe(true);
    expect((data.features ?? []).length, "features > 0 (capa tiene datos)").toBeGreaterThan(0);
  });

  test("GET /api/geo?layer=propuestas_poligono → 200 + FeatureCollection con >0 features", async ({
    request,
  }) => {
    await loginAsAdmin(request);
    const r = await request.get("/api/geo?layer=propuestas_poligono", {
      failOnStatusCode: false,
    });
    expect(r.status(), "GET /api/geo?layer=propuestas_poligono").toBe(200);

    const data = (await r.json()) as {
      type?: string;
      features?: Array<unknown>;
    };
    expect(data.type, "type debe ser 'FeatureCollection'").toBe("FeatureCollection");
    expect(Array.isArray(data.features), "features debe ser array").toBe(true);
    expect((data.features ?? []).length, "features > 0 (capa tiene datos)").toBeGreaterThan(0);
  });

  test("GET /api/geo?layer=predios → 200 + FeatureCollection con >0 features", async ({
    request,
  }) => {
    await loginAsAdmin(request);
    const r = await request.get("/api/geo?layer=predios", {
      failOnStatusCode: false,
    });
    expect(r.status(), "GET /api/geo?layer=predios").toBe(200);

    const data = (await r.json()) as {
      type?: string;
      features?: Array<unknown>;
    };
    expect(data.type, "type debe ser 'FeatureCollection'").toBe("FeatureCollection");
    expect(Array.isArray(data.features), "features debe ser array").toBe(true);
    expect((data.features ?? []).length, "features > 0 (capa tiene datos)").toBeGreaterThan(0);
  });
});
