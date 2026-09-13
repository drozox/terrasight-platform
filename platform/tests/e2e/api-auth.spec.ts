// =============================================================================
// tests/e2e/api-auth.spec.ts — DEEPSEEK-24
//
// Regresión de seguridad: los endpoints privados NO deben ser accesibles sin
// sesión. El middleware (`src/middleware.ts`) protege todo salvo:
//   - /login
//   - /api/auth/*   (handlers de NextAuth)
//   - /api/health   (uptime / anti-pausa de Supabase)
//
// Comportamiento esperado del middleware:
//   - Rutas HTML y rutas API: redirect 302 → /login?callbackUrl=...
//   - NO devuelve 401 (es una decisión de UX: browser-friendly).
//
// Este spec verifica:
//   1. /api/health es público (200)
//   2. /api/reportes, /api/search, /api/geo redirigen a /login sin sesión
//
// EJECUCIÓN (CI con server + BD):
//   npm run test:e2e
//
// Patrón: tests/e2e/health.spec.ts y smoke-routes.spec.ts.
// =============================================================================

import { test, expect } from "@playwright/test";

test.describe("DEEPSEEK-24 — guardas de auth en API", () => {
  test("/api/health es público sin sesión → 200", async ({ request }) => {
    const r = await request.get("/api/health", { failOnStatusCode: false });
    expect(r.status(), "/api/health debe responder 200 sin sesión").toBe(200);
  });

  test("/api/reportes sin sesión → redirect a /login", async ({ request }) => {
    const r = await request.get("/api/reportes", {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    // El middleware redirige (302/307) a /login. No esperamos 401 porque
    // la política del proyecto es redirect para mantener UX browser-friendly.
    expect([302, 307], "/api/reportes sin sesión debe redirigir a /login").toContain(r.status());
    expect(r.headers().location, "el redirect debe apuntar a /login").toMatch(/\/login/);
  });

  test("/api/search sin sesión → redirect a /login", async ({ request }) => {
    const r = await request.get("/api/search?q=gua", {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect([302, 307], "/api/search sin sesión debe redirigir a /login").toContain(r.status());
    expect(r.headers().location, "el redirect debe apuntar a /login").toMatch(/\/login/);
  });

  test("/api/geo sin sesión → redirect a /login", async ({ request }) => {
    const r = await request.get("/api/geo?layer=municipios", {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect([302, 307], "/api/geo sin sesión debe redirigir a /login").toContain(r.status());
    expect(r.headers().location, "el redirect debe apuntar a /login").toMatch(/\/login/);
  });
});
