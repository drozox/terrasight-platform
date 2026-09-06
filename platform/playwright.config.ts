import { defineConfig, devices } from "@playwright/test";

// =============================================================================
// Playwright config — SIG TERRITORIO e2e smoke tests (HU-CA-02).
//
// Estrategia:
// - Local:    reusa el dev server que ya está corriendo (npm run dev) si existe.
//             Si no, Playwright arranca uno en :3000.
// - CI:       SIEMPRE arranca `next dev -p 3001` (AeroAdmin AFM ocupa :3000).
// - Test dir: ./tests/e2e (convención Next.js + Vitest coexistirían aquí).
//
// Notas:
// - El baseURL apunta a 3001 por defecto. PLAYWRIGHT_BASE_URL puede
//   sobreescribirlo (útil para apuntar a un staging).
// - trace/screenshot: solo para reintentos/fallos → CI no se inunda de
//   artefactos cuando todo pasa.
// - Sin --with-deps en Windows: el script install-browser.ps1 (o el
//   propio workflow CI en Linux) instala las deps del sistema. En
//   Windows basta con `npx playwright install chromium`.
// =============================================================================

export default defineConfig({
  testDir: "./tests/e2e",
  // Los specs son smoke tests independientes — paralelizar acelera el feedback.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // El form de login redirige a /dashboard si ya hay sesión; en CI
    // partimos de un contexto limpio, no hace falta persistir storage.
    storageState: undefined,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Solo arrancamos dev server en CI. En local, el dev server lo levanta
  // el dev (`npm run dev -- -p 3001`) y reutilizamos.
  webServer: process.env.CI
    ? {
        command: "npx next dev -p 3001",
        url: "http://localhost:3001",
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      }
    : {
        command: "npx next dev -p 3001",
        url: "http://localhost:3001",
        reuseExistingServer: true,
        timeout: 60_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
