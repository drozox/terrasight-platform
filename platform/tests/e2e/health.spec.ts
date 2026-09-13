// =============================================================================
// tests/e2e/health.spec.ts
//
// /api/health es público (sin auth) y debe reportar el estado de la BD.
// Sirve para uptime monitoring y para el cron que evita la pausa de Supabase.
// =============================================================================

import { test, expect } from "@playwright/test";

test.describe("/api/health — health check público", () => {
  test("GET /api/health sin sesión → 200 y db up", async ({ request }) => {
    const r = await request.get("/api/health", { failOnStatusCode: false });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
    expect(body.db).toBe("up");
  });
});
