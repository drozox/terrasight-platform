# GitHub Actions — TerraSight

Workflows automatizados del repo `drozox/terrasight-platform`. Toda la
infra de CI vive en este directorio.

## Workflows activos

| Archivo     | Trigger                            | Qué hace                                                                                  | Duración típica |
| ----------- | ---------------------------------- | ----------------------------------------------------------------------------------------- | --------------- |
| `ci.yml`    | push a `main` · PR contra `main`   | Levanta PostGIS 16-3.4 como service → aplica migrations → typecheck → lint → vitest → e2e (Playwright). | ~6-9 min        |

## Jobs del workflow `ci.yml`

1. **`services.postgres`** — contenedor `postgis/postgis:16-3.4` con la BD
   `convenio_car_wwf`, usuario `terrasight`, puerto `5432`. Healthcheck
   vía `pg_isready` (5 reintentos × 10s).
2. **Install psql client** — `postgresql-client` no viene en `ubuntu-latest`
   por defecto; lo agregamos para que `ci-migrate.sh` pueda correr.
3. **Install deps** — `npm ci` con cache de `package-lock.json`.
4. **Apply migrations** — corre `platform/scripts/ci-migrate.sh`, que espera
   a Postgres, itera sobre `01-schema.sql`..`07-monitoreo-punto.sql` en orden
   y aborta ante cualquier error (`-v ON_ERROR_STOP=1`).
5. **Typecheck** — `npx tsc --noEmit`.
6. **Lint** — `next lint` (reglas de `eslint-config-next`).
7. **Unit tests** — `npm run test` (Vitest).
8. **Install Playwright browser** — `npx playwright install --with-deps chromium`
   (en Linux funciona con `--with-deps`; en Windows local NO — ver más abajo).
9. **Run Playwright e2e** — `npm run test:e2e`. El `playwright.config.ts`
   detecta `CI=true` y levanta `next dev -p 3001` automáticamente.
10. **Upload Playwright report** — si los e2e fallan, sube `playwright-report/`
    como artefacto (retención 7 días).

## Por qué `:3001` y no `:3000`

`AeroAdmin AFM` (otro proyecto) ocupa el `3000` local. La CI usa `3001`
para evitar conflicto. En local también podés levantar TerraSight ahí con
`npm run dev -- -p 3001` (o cambiar la URL via `PLAYWRIGHT_BASE_URL`).

## Variables de entorno inyectadas por el job

| Var                  | Valor                                                            | Para qué                                              |
| -------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| `POSTGRES_*`         | host/puerto/user/pass/db del service                             | `ci-migrate.sh` y conexión de la app.                 |
| `DATABASE_URL`       | `postgresql://terrasight:terrasight_dev@localhost:5432/...`      | `postgres-js` (cliente de Next.js).                   |
| `NEXTAUTH_SECRET`    | dummy CI-only (`ci-build-only-dummy-secret-not-for-prod-…`)      | NextAuth v5 firma/verifica JWT. NO usar en prod.       |
| `NEXTAUTH_URL`       | `http://localhost:3001`                                          | Canonical URL para redirects de NextAuth.             |
| `AUTH_TRUST_HOST`    | `true`                                                           | Confiar en `Host` header (dev detrás de proxy).       |
| `PLAYWRIGHT_BASE_URL`| `http://localhost:3001`                                          | `playwright.config.ts` lo lee.                        |
| `CI`                 | `true`                                                           | Activa `webServer` automático + retries en Playwright.|

## Cómo agregar un nuevo workflow

1. Crear `.github/workflows/<nombre>.yml`.
2. Reusar la sección `services.postgres` si el job necesita BD.
3. Reusar `Install psql client` + `Apply migrations` para sembrar la BD.
4. Si el workflow corre `npm run dev`, usar puerto distinto a `:3000`
   (default ya es `:3001` en `playwright.config.ts`).
5. Documentar el nuevo job acá arriba.

## Diferencias Linux (CI) vs Windows (local)

| Paso                  | Linux CI                                                                 | Windows local                                                                       |
| --------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `npx playwright install` | `--with-deps chromium` (instala libs del sistema via apt)              | Solo `chromium` (sin `--with-deps`: requiere admin + winget).                       |
| `npm install`         | `npm ci` desde lockfile puro.                                            | `npm install` (lockfile puede estar desincronizado con OneDrive reparse points).    |
| `next dev`            | SWC binary carga OK (Ubuntu).                                            | A veces falla con "is not a valid Win32 application" por OneDrive reparse points.   |
| `psql`                | Instalado vía `apt install postgresql-client`.                          | Viene con Docker Desktop; o usar `scripts/psql.ps1` que entra al contenedor.        |

## Estado actual

- **Sprint 11 (HU-CA-02..03)**: workflow `ci.yml` operativo. E2e cubre
  smoke de `/login`, redirect del middleware en `/predios` y `/reportes`,
  y el handler `/api/reportes`. Tests con sesión real (login, drill-down
  autenticado) están como `test.skip()` hasta que haya `db:seed:test-user`
  (siguiente sprint).
- **Pre-existente conocido**: hay errores de TS y lint en archivos que NO
  tocamos en este sprint (`tests/components/estado-dropdown.test.tsx`,
  regla `@typescript-eslint/no-explicit-any` no resuelta en `.eslintrc.json`).
  El CI los va a flagear — resolver antes de mergear el primer PR.
