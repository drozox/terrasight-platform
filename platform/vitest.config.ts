import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Unit + components en happy-dom. Integración (tests/integration) usa
    // `// @vitest-environment node` y se SALTA si no hay DATABASE_URL, así que
    // es seguro incluirlos acá: CI (con Postgres) los corre, local sin BD los
    // skip. Los e2e en tests/e2e/** los corre Playwright.
    include: [
      "tests/unit/**/*.test.ts",
      "tests/components/**/*.test.{ts,tsx}",
      "tests/integration/**/*.int.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/tests/e2e/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts", "src/components/ui/**/*.tsx"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
