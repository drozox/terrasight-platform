// =============================================================================
// HU-CA-03 — Smoke test de /predios (drill-down).
//
// Sin test user sembrado en CI, no podemos crear una sesión válida
// (NextAuth v5 firma el JWT con NEXTAUTH_SECRET — falsificar la cookie
// solo bypasea el middleware, no `auth()` del server component, que
// re-valida la firma y devuelve null → redirect a /login).
//
// Por eso validamos el redirect del middleware. El test "with auth" está
// documentado como `test.skip()` con la ruta para activarlo cuando
// exista `npm run db:seed:test-user` (siguiente sprint).
// =============================================================================

import { test, expect } from "@playwright/test";

test.describe("Predios — middleware de auth (HU-CA-03)", () => {
  test("GET /predios sin sesión redirige a /login con callbackUrl", async ({ page }) => {
    const response = await page.goto("/predios", { waitUntil: "domcontentloaded" });

    // El middleware emite un 307/302. Playwright lo sigue automáticamente
    // y nos deja en /login?callbackUrl=%2Fpredios.
    expect(response?.status()).toBeLessThan(400); // seguimos el redirect
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fpredios/);
  });

  test("GET /predios/nuevo sin sesión también redirige a /login", async ({ page }) => {
    await page.goto("/predios/nuevo");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fpredios%2Fnuevo/);
  });

  test("GET /predios/123 (detalle) sin sesión redirige a /login", async ({ page }) => {
    await page.goto("/predios/123");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fpredios%2F123/);
  });

  // ---------------------------------------------------------------------------
  // Tests con sesión real: desactivados hasta que haya test user sembrado.
  // Activar cuando `npm run db:seed:test-user` exista (HU-CA-04).
  // ---------------------------------------------------------------------------
  test.skip("con sesión válida: /predios renderiza la tabla y KPIs", async ({ page, context }) => {
    // TODO: cuando haya seed de test user, hacer signIn real y guardar
    // el storageState en `e2e/.auth/admin.json` para reusar.
    await context.addCookies([
      {
        name: "authjs.session-token",
        // JWT firmado con NEXTAUTH_SECRET del test env — ver docs/auth.md
        value: process.env.TEST_SESSION_TOKEN ?? "",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/predios");
    await expect(page.getByRole("heading", { name: "Predios" })).toBeVisible();
    // Tabla o empty state.
    await expect(page.locator("table")).toBeVisible();
  });
});
