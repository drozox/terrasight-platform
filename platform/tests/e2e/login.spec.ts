// =============================================================================
// HU-CA-02 — Smoke test de /login.
//
// Estos tests verifican que la página de login se renderiza correctamente
// y maneja errores. NO hacemos login real:
//   - Sin test user sembrado en CI no podemos crear sesión.
//   - El handler de error se valida con el query param `?error=...` que
//     la página ya soporta (FRIENDLY_ERROR map en login-form.tsx).
//
// Notas de robustez:
//   - Usamos `toBeAttached` en headings y `toBeVisible` en inputs/buttons.
//     El layout tiene main anidados + `overflow-hidden` y en local sin
//     SWC (Babel fallback) la visibilidad de h2 puede llegar tarde.
//   - El `getByRole("alert")` matchea también `__next-route-announcer__`
//     de Next.js (accesibilidad). Filtramos por texto del mensaje real.
//   - networkidle evita flakiness en cold start del dev server.
//
// Para tests de flujos autenticados ver HU-CA-03 (predios/reportes).
// =============================================================================

import { test, expect } from "@playwright/test";

test.describe("Login público (HU-CA-02)", () => {
  test("GET /login renderiza el form de autenticación", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    // El h2 "Iniciar sesión" es el título del formulario. Va dentro de
    // un main anidado; usamos toBeAttached para no pegarle al check de
    // viewport que es flaky en local (Babel fallback sin SWC).
    await expect(
      page.getByRole("heading", { name: "Iniciar sesión", level: 2 }),
    ).toBeAttached();

    // Inputs principales: sí o sí tienen que ser visibles e interactuables.
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();

    // Botón submit: visible y arrancando deshabilitado (email+password vacíos).
    const submit = page.getByRole("button", { name: /Ingresar/ });
    await expect(submit).toBeVisible();
    await expect(submit).toBeDisabled();
  });

  test("los inputs aceptan email y password; el botón se habilita", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    // networkidle garantiza que React terminó de hidratarse — sin esto,
    // el `onChange` aún no está attached y `fill()` no actualiza el state.
    await page.waitForLoadState("networkidle");

    const emailInput = page.getByLabel("Correo electrónico");
    const passwordInput = page.getByLabel("Contraseña");
    await emailInput.fill("test@ejemplo.com");
    await passwordInput.fill("unaPasswordCualquiera");

    await expect(page.getByRole("button", { name: /Ingresar/ })).toBeEnabled();
  });

  test("con ?error=CredentialsSignin muestra mensaje amigable de error", async ({ page }) => {
    // La página decodifica el param `error` y mapea a texto legible.
    // FRIENDLY_ERROR["CredentialsSignin"] = "Email o contraseña incorrectos."
    await page.goto("/login?error=CredentialsSignin", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    // role="alert" en login-form.tsx, pero Next.js también emite
    // <div role="alert" id="__next-route-announcer__"> para SR. Filtramos
    // por el texto que esperamos para evitar strict-mode violation.
    const alert = page.getByRole("alert").filter({ hasText: /Email o contraseña/i });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Email o contraseña incorrectos/i);
  });

  test("preserva callbackUrl en querystring (deep-link desde middleware)", async ({ page }) => {
    await page.goto("/login?callbackUrl=%2Fpredios", { waitUntil: "domcontentloaded" });

    // El form incluye un input hidden con el callbackUrl.
    const hidden = page.locator('input[type="hidden"][name="callbackUrl"]');
    await expect(hidden).toHaveValue("/predios");
  });
});
