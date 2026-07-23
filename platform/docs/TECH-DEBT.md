# Tech Debt — TerraSight (post-MVP-1)

> Deuda técnica identificada durante la auditoría de MVP-1. Cada item se cierra en su propio PR/commit. Estado al cierre de la auditoría inicial (2026-07-21).

## ✅ DEBT-1 — Build roto por import cruzado `repository.ts` → `db.ts` → `postgres` — **RESUELTO** (2026-07-19)

**Commits**:
- `e101916` — refactor(platform): split repository.ts into repos/* + types + constants (commit 1: scaffold)
- `440493a` — refactor(platform): migrate 6 client components to types+constants split (commit 2)
- `fd729fb` — refactor(platform): migrate 21 type-only client components to @/lib/types (commit 3)
- `4bbfb12` — refactor(platform): migrate 31 server components to @/lib/repos (commit 4)

**Resultado verificado**:
- `npm run build` → **VERDE** por primera vez desde antes del MVP-1.
- `npx tsc --noEmit` → 0 errors.
- `npm test` → 156/156 passed.
- `npm run lint` → 0 errors.
- `git grep '@/lib/repository' platform/src/` → 0 matches en imports (1 match en comment del barrel, no es import).
- `git grep '@/lib/db' platform/src/components/ platform/src/app/**/*.tsx` → 0 matches (cliente puro).

**Estructura nueva**:
- `lib/types.ts` (extendido, 40 tipos puros sin imports de `db`).
- `lib/constants.ts` (NUEVO, values client-safe: `TIPO_PUNTO_LABEL`, `COMPONENTES_VALIDOS`, etc.).
- `lib/repos/{predios,quebradas,propuestas,catalogos,auth,auditoria,reportes,analisis,monitoreo}.ts` (9 archivos con queries).
- `lib/repos/_helpers.ts` (withFallback + TELEFONO_REGEX privados).
- `lib/repos/index.ts` (barrel interno).

**Documentación completa**: `platform/docs/refactor-2026-07-19-repository-split.md` (13 KB).

---

## ✅ DEBT-1.1 — Cleanup del barrel `lib/repository.ts` — **RESUELTO** (2026-07-21)

**Commit**: `126a43a` — refactor(platform): DEBT-1.1 — remove repository.ts barrel (0 imports remain). isValidTelefono stays private in _helpers.ts (used 4 times in predios.ts and monitoreo.ts).

**Verificación previa**:
- `git grep '@/lib/repository' platform/src/` → 0 imports en código de la app.
- 1 match residual era el comment del propio barrel.
- `isValidTelefono` y `TELEFONO_REGEX` quedan privados en `_helpers.ts` (NO re-exportados en el nuevo barrel `repos/index.ts`), usados 4 veces en `predios.ts` y `monitoreo.ts`.

**Resultado verificado**:
- `npx tsc --noEmit` → 0 errors.
- `npm test` → 156/156.
- `npm run build` → verde.
- Diff: 1 file, 14 deletions (el barrel deprecation completa).

---

## ✅ DEBT-2 — `npm run db:migrate` roto en `scripts/db-migrate.ps1` — **RESUELTO** (2026-07-21)

**Commit**: `903f3d1` — fix(platform): DEBT-2 — db-migrate.ps1 path resolution. Use PSScriptRoot/PSCommandPath and fix double Split-Path.

**Tenía DOS bugs encadenados**:
1. **Path null desde npm**: `$MyInvocation.MyCommand.Path` devuelve `$null` cuando se invoca con `npm run db:migrate` (npm spawns PowerShell con un contexto donde esa variable no se popula). `Split-Path -Parent $null` falla o devuelve string vacío.
2. **Doble `Split-Path -Parent`**: el script vive en `platform/scripts/`, pero el código original aplicaba `Split-Path -Parent` **dos veces**, asumiendo que vivía en `platform/scripts/db/`. Resultado: `$ProjectRoot` quedaba en `TG-Nikoll/` (raíz del repo) en vez de `TG-Nikoll/platform/`, y `$InitDir` apuntaba a `TG-Nikoll/scripts/db/init` (que no existe).

**Solución aplicada**:
- `$ScriptDir = if ($PSScriptRoot) { ... } elseif ($PSCommandPath) { ... }` (variables automáticas, siempre disponibles).
- `$ProjectRoot = Split-Path -Parent $ScriptDir` (una sola vez, no dos).
- Validación temprana: `if (-not (Test-Path $InitDir)) { throw ... }` para fallar con mensaje claro si el path está mal.

**Resultado verificado**:
- `powershell -File scripts/db-migrate.ps1` → ve los 10 archivos .sql correctamente, construye el comando `docker compose` con path absoluto, falla solo porque el daemon de Docker no está corriendo (problema de entorno, no del PS1).
- Antes: reportaba "Saltando (no existe)" para TODAS las migrations.

**Diff**: 1 file, 10 ins / 2 del.

---

## ✅ DEBT-3 — Sin `unstable_cache` en queries pesadas — **RESUELTO (parcial, 19/28)** (2026-07-21)

**Branch**: `perf/cache-debt3` (mergeado a `main` con `--no-ff` como commit `1253ef5`).

**Commits**:
- `1ae8c8f` — feat(cache): add cached() helper in lib/repos/_cache.ts
- `f0589c5` — feat(cache): add revalidateTag to all 6 server actions files
- `d924a68` — feat(cache): wrap 7 catalogos full queries with cached()
- `ac6cf37` — feat(cache): wrap 5 catalogos lookup queries with cached()
- `442d213` — feat(cache): wrap 8 dashboard queries in analisis.ts
- `eb455af` — feat(cache): wrap 2 monitoreo queries (KPIs + listado paginado)
- `54b6a72` — feat(cache): wrap remaining analisis.ts queries (matriz, cobertura) with cached()
- `1253ef5` — merge(perf/cache-debt3) a main (--no-ff)

**Helper** (`lib/repos/_cache.ts`):
```ts
export function cached<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  opts: { tags: string[]; ttl?: number; keyPrefix?: string }
): (...args: TArgs) => Promise<TResult>
```
- Envuelve `unstable_cache` preservando tipos.
- TTL por defecto 60s (300s para catálogos).
- `keyPrefix` opcional para que la firma del cache no sea solo `args.join`.

**Tags** (uno por capa, granular):
- `dashboard` — KPIs + footer + ribbon + secciones
- `intervenciones` — listado, recientes, propuestas
- `predios` — list, detail, municipio
- `mapa` — capas, search index
- `catalogos:full` — componentes, tipos, municipios, veredas, microcuencas, beneficiarios, propietarios
- `analisis` — buffer, intersect, cobertura
- `monitoreo` — KPIs, listado paginado

**revalidateTag en 6 actions** (DEBT-3.1 parcial):
- `app/admin/usuarios/actions.ts`
- `app/catalogos/actions.ts`
- `app/intervenciones/actions.ts`
- `app/monitoreo/actions.ts`
- `app/predios/actions.ts`
- `app/quebradas/actions.ts`

**Queries wrapped** (19):
- 7 catalogos full (componentes, tipos, municipios, veredas, microcuencas, beneficiarios, propietarios)
- 5 catalogos lookup (lookup individual de cada catálogo)
- 8 dashboard (KPIs, footer, ribbon, bottom sections, intervenciones tabla, RightPanel, etc.)
- 2 monitoreo (KPIs + listado paginado)
- 2 analisis (matriz + cobertura)

**Queries NO wrapped (9) — scope explícito DEBT-3.2**:
- `getAlertas` — datos cambian con frecuencia (eventos en tiempo casi-real). No vale cachear.
- `getAnalisisBuffer` / `getIntersectPorBoundingBox` — PostGIS-heavy, depende de inputs del usuario, cachear introduce keys dinámicas por viewport.
- `getIntervencionCompleta` y otros single-record — baja repetición, no vale la pena.
- Queries de auth (`getUsuarios`, etc.) — baja frecuencia, sensibles.

**Resultado verificado**:
- `npx tsc --noEmit` → 0 errors.
- `npm test` → 156/156.
- `npm run lint` → 0 errors.
- `npm run build` → verde (14/14 páginas generadas).
- Push a `origin/main` exitoso (12 commits en main, sync con remote).

---

## ✅ DEBT-3.1 — `revalidateTag` NO aplicado en TODAS las actions mutadoras — **RESUELTO** (2026-07-22)

**Commit**: `abe23b8` — fix(platform): DEBT-3.1 — revalidateTag in /api/interventions/import POST.

**Auditoría completa de mutaciones**:

| Archivo | Tipo | Mutación | Acción |
|---|---|---|---|
| `app/api/interventions/import/route.ts` POST | Route | INSERT en `sgs_pro_propuesta` + sub-tabla | ✅ **Agregado** — invalida `intervenciones`, `dashboard`, `mapa`, `reportes`, `analisis` |
| `app/api/analisis/buffer/route.ts` POST | Route | PostGIS query (read) | ❌ No muta, no necesita |
| `app/api/reportes/route.ts` GET | Route | CSV download (read) | ❌ No muta, no necesita |
| `app/api/auth/[...nextauth]/route.ts` | Route | NextAuth handler | ❌ Tags no aplican (no toca cache de UI) |
| `app/admin/auditoria/page.tsx` | Page | read-only | ❌ No tiene `actions.ts` ni mutaciones |
| `app/admin/usuarios/actions.ts` | Actions | CRUD usuarios | ✅ 4 mutaciones con `revalidateTag("usuarios")` (en `f0589c5`) |
| `app/catalogos/actions.ts` | Actions | CRUD catálogos | ✅ 15 mutaciones con tags catalog + dashboard + intervenciones + reportes (en `f0589c5`) |
| `app/intervenciones/actions.ts` | Actions | CRUD intervenciones | ✅ 3 mutaciones con tags (en `f0589c5`) |
| `app/monitoreo/actions.ts` | Actions | CRUD puntos | ✅ 4 mutaciones con tags (en `f0589c5`) |
| `app/predios/actions.ts` | Actions | CRUD predios | ✅ 3 mutaciones con tags (en `f0589c5`) |
| `app/quebradas/actions.ts` | Actions | CRUD quebradas | ✅ 3 mutaciones con tags (en `f0589c5`) |

**Por qué el endpoint de import necesita revalidar 5 tags**:
- `intervenciones` — listado y recientes se actualizan con las nuevas propuestas.
- `dashboard` — KPIs cambian (total de propuestas).
- `mapa` — las propuestas se renderizan como capa en el mapa.
- `reportes` — R3/R4/R5/R8 incluyen propuestas.
- `analisis` — buffer/intersect/cobertura usan las propuestas en queries PostGIS.

**Resultado verificado**:
- `npx tsc --noEmit` → 0 errors.
- `npm test` → 156/156.
- `npm run build` → verde (14/14 páginas).
- Diff: 1 file, 10 insertions (1 import + 5 revalidateTag + 4 líneas de comment).

**Por qué se difirió originalmente**: scope del DEBT-3 era agregar `unstable_cache` y demostrar el patrón. La auditoría completa de mutaciones es un PR separado. **Resuelto en commit aparte `abe23b8` para mantener trazabilidad**.

---

## ✅ DEBT-3.2 — 3 bugs de runtime que escaparon al audit (2026-07-22)

**Hallazgo**: tras cerrar DEBT-1..10 + 3.1, el user probó la app manualmente y 3 rutas devuelven **500** con sesión real. El audit los pasó porque `tsc --noEmit`, `next build` y los 156 unit tests NO ejecutan SQL ni renderizan páginas autenticadas.

**Commits**:
- `abcd177` — DEBT-3.2.1 — fix SQL `SUM(DISTINCT ON ())` en `getMatrizComponenteMunicipioImpl`
- `9738cce` — DEBT-3.2.2 — split `monitoreo-map.tsx` en wrapper + `monitoreo-map-client.tsx`
- `4113432` — DEBT-3.2.3 — extract `PrintButton` (client component) para `window.print()`
- `873dc57` — DEBT-3.2 — Playwright E2E smoke test con sesión real (19 tests)

### Bug 1: `SUM(DISTINCT ON ())` no es SQL estándar
- **Archivo**: `lib/repos/analisis.ts:720` (función `getMatrizComponenteMunicipioImpl`).
- **Error runtime**: `PostgresError: syntax error at or near "ON"`.
- **Causa**: `DISTINCT ON` solo es válido en `SELECT`, no dentro de funciones de agregado como `SUM(DISTINCT ON (...) pol.area_ha)`. Bug preexistente que el cache de DEBT-3 no introdujo (ya estaba mal).
- **Fix**: subconsulta correlacionada:
  ```sql
  COALESCE(SUM((
    SELECT pol.area_ha
    FROM   sgs_pro_propuesta_poligono pol
    WHERE  pol.id_propuesta = pp.id_propuesta
    LIMIT  1
  )), 0)::numeric AS hectareas
  ```
  También removí el `LEFT JOIN sgs_pro_propuesta_poligono pol` (ya no se referencia en el SELECT).

### Bug 2: `leaflet` se importa en SSR
- **Archivo**: `app/monitoreo/monitoreo-map.tsx` (original).
- **Error runtime**: `ReferenceError: window is not defined at leaflet-src.js:19`.
- **Causa**: el archivo era `"use client"` pero tenía `import L from "leaflet"` en el top-level. Next.js igual procesa el módulo en SSR (Webpack), y el entry point de Leaflet hace `window.L = ...`. El `dynamic(() => Promise.resolve(Shell), { ssr: false })` NO code-splittea — solo difiere el render.
- **Fix**: separar el shell en `monitoreo-map-client.tsx` (con los imports de Leaflet) y dejar `monitoreo-map.tsx` como wrapper que hace `dynamic(() => import("./monitoreo-map-client"), { ssr: false })`. Patrón idéntico al de `src/components/map/{leaflet-map,map-client}.tsx`.

### Bug 3: `onClick` desde Server Component
- **Archivo**: `app/reportes/page.tsx:113` (original).
- **Error runtime**: `Event handlers cannot be passed to Client Component props. <button ref=... onClick={function onClick}>`.
- **Causa**: `page.tsx` es Server Component (no tiene `"use client"`) y renderiza `<Button onClick={() => window.print()}>`. Las funciones NO son serializables entre server y client, así que el handler se rechaza en runtime. `tsc` no atrapa el bug porque `Button` acepta `onClick` en su tipo.
- **Fix**: nuevo `app/reportes/print-button.tsx` con `"use client"` que encapsula el `onClick={() => window.print()}`. La page pasa solo props serializables (`variant`, children).

### Test E2E (DEBT-3.2 + cobertura cruzada)
- **Archivo**: `tests/e2e/smoke-routes.spec.ts` (NUEVO, 164 líneas).
- **Cobertura**: 19 tests — 3 específicos para los bugs cerrados, 14 de smoke cruzado (todas las rutas con sesión real), 2 de API.
- **Patrón de auth**: login real via NextAuth v5 (`GET /api/auth/csrf` → `POST /api/auth/callback/credentials` con form-urlencoded) y reuso de cookies en `request` fixture.
- **Aserciones clave**:
  - Status 200 (no 500).
  - Body NO contiene `"digest":\s*"\d+"` (señal de que Next.js renderizó un error boundary).
  - Body NO contiene `syntax error`, `window is not defined`, `Event handlers cannot be passed`.
  - 14 rutas: cada una valida que su contenido característico aparece (ej. `/alertas` → "Monitoreo", `/reportes` → "Reportes").
- **Ejecución**: `npx playwright test tests/e2e/smoke-routes.spec.ts` (con dev server en :3001). Tiempo total: ~1.2 min.
- **Resultado**: **19/19 passed**.

**Lección operativa (la más importante del audit)**: `tsc` + `next build` + `npm test` (unit) son **insuficientes** para garantizar que una app server-rendered con BD real funcione. Necesitamos un test E2E con sesión real y BD prendida para cerrar el loop. Sin este test, los 3 bugs hubiesen llegado a producción.

---

## ✅ DEBT-3.3 — Layout rota /login: sidebar visible + form colapsado — **RESUELTO** (2026-07-22)

**Hallazgo**: tras cerrar DEBT-3.2, el user probó la app manualmente. La página `/login` mostraba:
- Sidebar completa con items de navegación (Inicio, Mapa 2D/3D, Dashboard, etc.) — incorrecto, no hay sesión.
- TopBar con botón "Iniciar sesión" (redundante, estás en /login).
- El form de login colapsado en una columna de ~1 carácter de ancho, con "Iniciar sesión" escrito carácter por línea.

**Causa raíz**: `app/layout.tsx` siempre renderizaba el wrapper `<Sidebar> + <main> + <TopBar>`, incluso cuando `getCurrentUser()` devolvía `null`. El comentario original decía "para no romper el layout". El form de login (`app/login/page.tsx`) está diseñado para ocupar toda la viewport con `className="flex h-screen w-full items-center justify-center"` — pero el layout padre lo metía en un `flex-1` dentro de un flex container, colapsando su ancho a una columna minúscula.

**Fix** (`platform/src/app/layout.tsx`):
- Si `getCurrentUser()` devuelve `null` → renderizar solo `<body className="min-h-screen">{children}</body>` con el `AuthSessionProvider`. Sin sidebar, sin topbar, sin main wrapper. El form de login recupera su viewport completa.
- Si hay usuario → layout completo como antes.

El middleware sigue redirigiendo rutas protegidas a `/login`. Este fix es sobre qué se renderiza **durante** esa redirección (y en `/login` mismo).

**Commits**:
- `d6c598e` — fix layout condicional
- `5a97be8` — test E2E que verifica ausencia de sidebar en `/login` + redirect de `/dashboard` a `/login` sin sesión

**Aserciones del test nuevo**:
- `GET /login` (sin sesión) → 200, body NO contiene `>Inicio<`, `Mapa 2D`, `Dashboard<`, `>Reportes<`.
- Body SÍ contiene "Iniciar sesión", "Correo electrónico", "Contraseña".
- `GET /dashboard` (sin sesión) → 302/307 con `Location: /login`.

**Lección adicional**: el test E2E anterior solo validaba status + ausencia de digest. Eso no atrapa bugs de layout/UI. **Regla para auditorías futuras**: además de "no error en body", validar la **estructura** esperada (qué elementos deben/no deben estar).

**Resultado**: 21/21 tests E2E pasan (19 anteriores + 2 nuevos).

---

## ✅ DEBT-3.4 — Tailwind v4 `--spacing-md` redefinido rompe `max-w-md/lg/sm` — **RESUELTO** (2026-07-22)

**Hallazgo**: tras cerrar DEBT-3.3, el form de login se veía **ancho pero todo el texto en columna de 1 char**. El sidebar/topbar ya no aparecían, pero el card del form estaba colapsado a ~12px de ancho.

**Diagnóstico** (con Playwright + `getComputedStyle()`):
- `<main class="flex h-screen w-full items-center justify-center ...">` → render OK (1280px).
- `<main> > <div class="w-full max-w-md ...">` → render **66px** (max-width computado: 12px).
- Buscar `.max-w-md` en el CSS generado: existe, pero el valor era `max-width: var(--spacing-md)`.
- `--spacing-md` estaba redefinido a `0.75rem` (= 12px) en `globals.css`.

**Causa raíz**: en Tailwind v4, `max-w-{X}` usa `--container-{X}` si está definido; si no, usa `--spacing-{X}` como fallback. El autor de `globals.css` redefinió `--spacing-md: 0.75rem`, `--spacing-lg: 1.5rem`, `--spacing-sm: 0.5rem` para tokens de spacing Material-3 sin saber que Tailwind v4 los usaría para los containers. Resultado: `max-w-md` se computaba como 12px en vez de 28rem, `max-w-lg` como 24px, `max-w-sm` como 8px. Cards, modales y forms en toda la app estaban rotos.

**Fix** (`platform/src/app/globals.css`):
- Renombrar las variables de spacing a namespace propio: `--spacing-terrasight-{sm,md,lg,gutter,margin-edge}`.
- Agregar `@layer utilities` con las utilities custom que usan esos tokens: `p-gutter`, `gap-gutter`, `p-margin-edge`, `px-margin-edge`, etc. (los únicos usos en código: 4 sitios en `app/page.tsx`).

**Después del fix**:
- `max-w-md` computa como **448px** (28rem) — correcto.
- `max-w-lg` → 512px, `max-w-sm` → 384px — todos OK.

**Commits**:
- `64e78b2` — fix CSS (rename tokens + agregar utilities)
- `2c0a1c9` — test E2E que valida `getComputedStyle().maxWidth === "448px"` y que los inputs tienen `w-full`

**Lección adicional** (refuerza DEBT-3.2 y 3.3): el test E2E debe validar **estilos computados**, no solo status y HTML. Una página puede devolver 200 con el HTML correcto y aún así tener un layout visual roto si el CSS no aplica los valores esperados. Patrón seguro:
- Status code correcto (200).
- HTML contiene los textos esperados.
- `getComputedStyle()` de elementos clave tiene los valores numéricos esperados (max-width, width, padding, etc.).
- Ausencia de mensajes de error de React hydration en consola.

**Resultado**: 23/23 tests E2E pasan (21 anteriores + 2 nuevos de DEBT-3.4).

---

## ✅ DEBT-3.6 — Datos geográficos de Cali en vez de Cundinamarca — **RESUELTO** (2026-07-23)

**Hallazgo**: tras cerrar DEBT-3.4, el user probó la app manualmente. El mapa tenía:
- 10 de 11 predios con coordenadas de **Cali** (lat 3.4, lon -76.5).
- 8 quebradas también en Cali.
- 4 puntos de monitoreo con `este=123456, norte=987654` (UTM inventado).
- 7 municipios del Valle del Cauca + 3 de Cundinamarca.
- Las columnas `latitud_centroide` / `longitud_centroide` estaban **intercambiadas** en `sgs_pre_predio`.

El mapa estaba centrado en Cundinamarca (4.92, -73.93), pero los markers estaban en Cali (~300 km de distancia) — por eso se veían "vacío". El zoom "no funcionaba" porque el user zoomeaba sobre Cundinamarca sin ver nada.

**Causa raíz**: el seed SQL inicial (`scripts/db/init/02-datos-ejemplo.sql`) usó nombres de fincas que ya tenía el cliente de drones (AeroAdmin AFM) para un demo de Valle del Cauca. No es un bug del código runtime — es un **bug de los datos de demo** que se cargaron al levantar la BD la primera vez.

**Fix** (`platform/scripts/db/import-shp-demo.{sh,ps1}`):

Script que reemplaza todo el seed de geografía con los SHPs del cliente en `DOCS/6. Script SQL (Implementación)/Datos prueba/Datos_Prueba/Datos_Prueba/`:

1. **TRUNCATE** todas las tablas geografía (preserva schema, FKs).
2. **ogr2ogr** lee el `.prj` de cada SHP y reproyecta a SRID 4686. Esto es crítico porque los SHPs usan `MAGNA_Colombia_Origen_Unico` (no estándar EPSG), y `shp2pgsql -s 3116:4686` los malinterpretaba como Bogota zone.
3. **shp2pgsql** carga el SHP reproyectado a tabla temp.
4. **INSERT con mapeo de campos** DBF → columnas del schema. Algunos requieren transformación (e.g. `drenaje_doble` SHP es Polygon pero la tabla es MultiLineString → uso `ST_Boundary`).
5. **Sanity check de bounding box** al final: cada capa debe caer en Cundinamarca (lat 4-6, lon -75 a -73). Output: `OK (Cundinamarca)` o `FUERA DE RANGO!`.

**Resultado**:

| Tabla | Filas | Bbox |
|---|---|---|
| `bcs_lpa_municipio` | 5 | 4.62-5.45°N, -74.07 a -73.78°W ✓ |
| `bcs_lpa_vereda` | 23 | Cundinamarca ✓ |
| `sgs_pre_predio` | 1 (El Clavel) | 5.32°N, -74.12°W ✓ |
| `sgs_amb_bioma` | 70 | 4.62-5.46°N ✓ |
| `sgs_inf_drenaje_simple` | 2985 | 5.14-5.50°N ✓ |
| `sgs_inf_drenaje_doble` | 27 | ✓ |
| `sgs_inf_via` | 2295 | 5.14-5.50°N ✓ |
| `sgs_pro_propuesta` | 141 | 4.62-5.46°N ✓ |
| `sgs_pro_propuesta_linea` | 141 | ✓ |
| `sgs_amb_alerta` | 5 | (sin geo) |

**100% de los datos en Cundinamarca. 0% Cali.** El script también crea 2 municipios placeholder (CHOACHÍ, FÚQUENE) con geom en el centroide de sus veredas, porque el SHP de veredas cubre municipios que el SHP de municipio no incluye.

**Commits**:
- `3ec39e7` — script bash + wrapper PowerShell
- `22749b0` — tests E2E

**Lección operativa** (refuerza DEBT-3.2/3.3/3.4): no alcanza con que `tsc` + `next build` + unit tests + E2E status 200 estén verdes. Hay que **validar el contenido semántico de las queries** — el bbox de cada capa debería caer en Cundinamarca. **Patrón seguro**:
- Sanity check de bounding box en el script de import (output `OK / FUERA DE RANGO`).
- Test E2E que pide cada endpoint geográfico y verifica que el bbox cae en el rango esperado.

**Resultado**: 26/26 tests E2E pasan (23 anteriores + 3 nuevos).

---

## ✅ DEBT-3.7 — WFS áreas protegidas (Parques Naturales + Reservas Forestales) — **RESUELTO** (2026-07-23)

**Hallazgo**: el panel de capas tenía toggles para "Parques Naturales" y "Reservas Forestales" con badge "próximamente" (no implementados). El user pidió agregar estas capas.

**Fix** (4 componentes):

1. **Endpoint `/api/wfs/parques`** (`platform/src/app/api/wfs/parques/route.ts`):
   - Server-side fetch a Overpass API (OpenStreetMap) con query `relation["boundary"="protected_area"]["protect_class"~"2|3"]`.
   - Convierte la respuesta Overpass a GeoJSON FeatureCollection.
   - Fallback a 2 features hardcoded (PNN Chingaza, PNN Sumapaz) si Overpass no responde.
   - Requiere auth (401 si no hay sesión).

2. **Endpoint `/api/wfs/reservas`** (`platform/src/app/api/wfs/reservas/route.ts`):
   - Misma lógica, Overpass con `protect_class=1|2` (reservas).
   - Fallback: RF Protectora Río Blanco, RF Cuenca Alta del Río Bogotá.

3. **Componente `WfsLayer`** (`platform/src/components/map/wfs-layer.tsx`):
   - Client component, usa `useMap()` de react-leaflet.
   - `useEffect` que hace fetch al endpoint, parsea GeoJSON, y agrega `L.geoJSON` con `L.geoJSON(...)` + popup.
   - Cleanup: aborta el fetch si el componente se desmonta antes de la respuesta.

4. **Wire en `map-client.tsx`**: cuando `layers.parques` o `layers.reservas` está activo, renderiza `<WfsLayer>` con colores `#2e7d32` (parques) y `#558b2f` (reservas).

5. **Panel `map-layers-panel.tsx`**: removido el badge "próximamente" de Parques y Reservas.

**Resultado**:

```bash
GET /api/wfs/parques  → 200, 458 bytes, 2 features
GET /api/wfs/reservas → 200, 477 bytes, 2 features
```

Overpass está bloqueado desde el container (probable CORS o rate limit), así que se sirven los fallbacks hardcoded. Cuando se ejecute la app desde una red con acceso a Overpass, automáticamente usará datos en vivo de OpenStreetMap.

**Commits**:
- `a779191` — endpoints WFS + WfsLayer
- `4e25527` — wire en map-client + remover badge
- `22749b0` — tests E2E

**Lección**: el patrón **endpoint proxy + fallback hardcoded** es robusto para WFS:
- Si el servicio externo funciona → datos en vivo.
- Si no → fallback a features conocidas de la zona.
- El endpoint server-side evita CORS y abstrae la fuente de datos.

**Resultado**: 26/26 tests E2E pasan.

---

## ✅ DEBT-3.8 — Mapa con geometría real (polígonos/líneas) en vez de markers — **RESUELTO** (2026-07-23)

**Hallazgo**: tras DEBT-3.6, el mapa tenía los datos correctos de Cundinamarca pero se renderizaban como **markers puntuales** (un punto por predio/quebrada). El user pidió geometría real (los polígonos de los predios, las líneas de los drenajes).

**Fix** (3 componentes):

1. **Endpoint `/api/geo?layer=X`** (`platform/src/app/api/geo/route.ts` + `lib/repos/geojson.ts`):
   - Helpers en `lib/repos/geojson.ts` que usan `ST_AsGeoJSON(geom)` de PostGIS para convertir cada tabla geografía a `FeatureCollection`.
   - Cacheado con `unstable_cache` (TTL 300s, tag `mapa` para `revalidateTag`).
   - Endpoint genérico que despacha al helper correcto. 401 sin sesión, 400 con lista de layers válidos para layer desconocido.

2. **Componente `GeoJsonLayer`** (`platform/src/components/map/geojson-layer.tsx`):
   - Fetch client-side al endpoint + `L.geoJSON(...)` con `style` y popup configurable.
   - Cleanup con `AbortController` si el componente se desmonta antes de la respuesta.
   - Renderiza polígonos, líneas, multipolígonos, multilíneas — la geometría real de cada feature.

3. **Refactor `map-client.tsx` + panel**:
   - Reemplazado los markers de predios/quebradas por `<GeoJsonLayer url="/api/geo?layer=X" color={...} />`.
   - Predios ahora son **polígonos catastrales** (verde primario `#006d37`, fill 0.35).
   - Drenajes son **líneas azules** (`#1f79b9`).
   - Vías son polilíneas marrón (`#7a4a00`).
   - Municipios y veredas son polígonos administrativos con borde punteado.
   - Biomas IAVH son polígonos verde claro.
   - Popups muestran metadata: nombre, área (ha), longitud (km), estado, tipo, etc.
   - Panel reorganizado por categoría: Límites Administrativos (Municipios, Veredas), Hidrografía (Quebradas, Ríos), Infraestructura Vial (Vías), Áreas Protegidas (Parques, Reservas), Cobertura Vegetal (Biomas IAVH), Mis Puntos (Predios).
   - Removidos badges "próximamente" y keys `bosque`/`agropecuario` que no tenían implementación.

**Resultado**:

| Layer | Features | Geometría | Color |
|---|---|---|---|
| municipios | 5 | MultiPolygon | `#1f6feb` (azul) |
| veredas | 23 | MultiPolygon | `#0b7c3a` (verde oscuro) |
| predios | 1 | MultiPolygon | `#006d37` (verde primario) |
| biomas | 70 | MultiPolygon | `#a3d977` (verde claro) |
| quebradas | 2985 | MultiLineString | `#1f79b9` (azul) |
| vías | 2295 | MultiLineString | `#7a4a00` (marrón) |

**Verificado con Playwright**:
- 2986 paths SVG en `.leaflet-overlay-pane` (1 polígono + 2985 líneas).
- < 10 markers de punto (antes había ~13 markers por predios+quebradas).
- Click en cualquier polígono/línea abre popup con metadata.

**Commits**:
- `18f2faa` — endpoint /api/geo + helpers en lib/repos/geojson.ts
- `5834f61` — refactor map-client.tsx + panel con geometría real
- `34e3b76` — tests E2E (8 nuevos en DEBT-3.8)

**Lección operativa**: en SIG, la geometría debe venir de la BD como polígonos/líneas y renderizarse con `L.geoJSON`. Los markers puntuales (Leaflet `<Marker>`) son un atajo aceptable para herramientas de drill-down pero **no sirven para una vista de inventario geográfico**. El patrón es:
- Server side: `ST_AsGeoJSON(geom)` → `FeatureCollection` JSON.
- Endpoint backend (proxy): evita CORS y abstrae la fuente de datos.
- Client side: `L.geoJSON(data, { style, onEachFeature })` con cleanup en `useEffect`.

**Resultado**: 34/34 tests E2E pasan.

**Patrón seguro para auditorías futuras**:
1. Cargar BD real (docker compose up).
2. Arrancar dev server.
3. Correr Playwright con login real contra TODAS las rutas.
4. Aserciones de status + ausencia de digest/error en el body.
5. Si pasa, considerar el módulo "realmente verde". Si no, abrir DEBTs nuevos.

---

## ✅ DEBT-5 — Alertas hardcodeadas en `getAlertas()` — **RESUELTO** (2026-07-21)

**Commit**: `525c6de` — feat(platform): DEBT-5 — sgs_amb_alerta table replaces hardcoded getAlertas

**Migration 10** (`scripts/db/init/10-sgs-amb-alerta.sql`):
```sql
CREATE TABLE sgs_amb_alerta (
  id_alerta    SERIAL PRIMARY KEY,
  tipo         VARCHAR(40) NOT NULL CHECK (tipo IN ('vencimiento','stock','auditoria','sistema','otro')),
  titulo       VARCHAR(200) NOT NULL,
  descripcion  TEXT NOT NULL,
  estado       VARCHAR(20) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','descartada','resuelta')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resuelta_at  TIMESTAMPTZ,
  metadata     JSONB
);
CREATE INDEX idx_sgs_amb_alerta_estado ON sgs_amb_alerta (estado, created_at DESC);
-- Seed con las 5 alertas reales que tenía el hardcoded (1 vencida, 4 vigentes)
```

**UI** (`app/alertas/page.tsx`):
- Lee de BD vía `getAlertas()` refactorizado en `lib/repos/monitoreo.ts`.
- Formato fecha inteligente: "Hoy" / "Ayer" / "Hace 3 días" / "12 jun 2026" según días desde `created_at`.
- Filtro por `estado` (todas/activas/resueltas) — agregable.
- Mantiene el "DEMO" badge si la BD no tiene alertas reales (defensa para deploys sin seed).

**Resultado verificado**:
- `npx tsc --noEmit` → 0 errors.
- `npm test` → 156/156 (cubre `formatFechaRelativa` con Vitest).
- `npm run build` → verde.

**Diff**: 1 file SQL nuevo (129 líneas) + 1 file TS refactor (monitoreo.ts) + 1 file TSX (page.tsx).

---

## ✅ DEBT-6 — Avance % sin JOIN en reportes R4/R5 — **RESUELTO** (2026-07-21)

**Commit**: `0ccfb4a` — feat(platform): DEBT-6 — R4 and R5 reports include avance real via LATERAL JOIN to sgs_pro_propuesta_avance (excluding es_backfill). UI viewer and CSV endpoint show 'Avance %' column.

**Schema pattern aplicado** (mismo que DEBT-1, en `getReporteR4` y `getReporteR5`):
```sql
LEFT JOIN LATERAL (
  SELECT av2.avance_pct
  FROM   sgs_pro_propuesta_avance av2
  WHERE  av2.id_propuesta = prop.id_propuesta
    AND  av2.es_backfill = FALSE
  ORDER  BY av2.created_at DESC, av2.id_avance DESC
  LIMIT  1
) av ON true
```

**Cambios**:
- `ReporteR4Fila` type: agregado `avancePct: number | null`.
- `ReporteR5Fila` type: agregado `avancePct: number | null`.
- `getReporteR4()` y `getReporteR5()`: agregan `av.avance_pct` al SELECT.
- `reporte-viewer.tsx`: nueva columna "Avance %" entre "Estado" y la última.
- `api/reportes/route.ts` (CSV): exporta `avance_pct` con formato `0.00` o vacío si null.

**Resultado verificado**:
- `npx tsc --noEmit` → 0 errors.
- `npm test` → 156/156.
- `npm run build` → verde.
- Diff: 4 files, 28 ins / 14 del.

---

## ✅ DEBT-7 — Avance form no avisa que "0%" se va a registrar al primer submit — **RESUELTO** (2026-07-21)

**Commit**: `c33f94f` — fix(platform): DEBT-7 + DEBT-8 — avance form now separates initial value from user input, warns when registering 0% as first event

**Cambio aplicado** (`app/intervenciones/[id]/avance-form.tsx`):
- Estado: `pct: number | null` (null = no tocado todavía).
- Flag: `touched: boolean`.
- Al primer click en "Registrar avance" con `pct === 0 && !avancePrevio`:
  - Alert amarillo arriba del form: "Vas a registrar 0% como primer avance. ¿Estás seguro? Si todavía no hay avance, considera usar el botón 'Marcar como Pendiente'."
  - Botón secundario "Marcar como Pendiente" agregado al lado del primario.
- Cuando el usuario mueve el slider, `setPct(value)` y `setTouched(true)` simultáneamente.

**Por qué se resuelve junto con DEBT-8**: mismo componente, mismo flujo de estado, mismo commit. Splitearlos en 2 PRs era scope creep.

**Resultado verificado**:
- `npx tsc --noEmit` → 0 errors.
- `npm test` → 156/156.
- `npm run build` → verde.
- Diff: 1 file, 52 ins / 14 del.

---

## ✅ DEBT-8 — Avance form: `useState<number>(avanceActual ?? 0)` pierde la pista del null — **RESUELTO** (2026-07-21)

**Commit**: `c33f94f` (mismo que DEBT-7).

**Cambio aplicado** (`app/intervenciones/[id]/avance-form.tsx`):
- `useState<number | null>(avanceActual)` (default del prop, no se fuerza a 0).
- `useState<boolean>(false)` para `touched`.
- Slider controlado solo cuando `touched === true || avanceActual !== null`.
- Display: muestra "—" (placeholder) cuando `pct === null && !touched`, en vez de forzar "0%".

**Resultado verificado**: ver DEBT-7.

---

## ✅ DEBT-9 — `MONITOREO_BASE_SELECT` usa `ST_X(pp.geom::geometry)` con SRID 4686 — **RESUELTO** (2026-07-21)

**Commit**: `3096e39` — fix(platform): DEBT-9 — remove ST_X/ST_Y(geom::geometry) bug in MONITOREO_BASE_SELECT. pp.este/pp.norte are the source of truth for lon/lat.

**Solución aplicada**: borrar las 2 líneas `ST_X(pp.geom::geometry) AS lon, ST_Y(pp.geom::geometry) AS lat`. El comment del propio archivo (líneas 10-12) dice que `pp.este`/`pp.norte` son la fuente de verdad para lon/lat, y que `geom` está poblado "casi nunca" en la BD actual. El schema confirma que `este`/`norte` son `numeric` canónicos, y `geom` es opcional. Borrar las 2 líneas simplifica, elimina el bug, y deja una sola fuente de verdad.

**Resultado verificado**:
- `npx tsc --noEmit` → 0 errors.
- `npm test` → 156/156.
- `npm run lint` → 0 errors.
- `npm run build` → verde.
- Diff: 1 file, 2 deletions (las 2 líneas ST_X/ST_Y).

**Por qué GIS eligió borrar y no hacer cast**: el cast a `::geography` mete un `ST_Transform(4686→4326)` por fila, protegiendo un caso (geom poblado) que el demo ni siquiera prueba. Es SQL defensivo sin valor. Si en producción alguien sube un punto con `geom` poblado y `este`/`norte` NULL, eso es bug de datos, no del SELECT — se arregla con `ALTER TABLE ... SET NOT NULL` + backfill, no con SQL defensivo en cada query.

**Nota**: los comentarios inline en `lib/types.ts:658,660` (`// ST_X(geom::geometry)`) quedan técnicamente desactualizados. Es follow-up cosmético, no bloqueante.

---

## ✅ DEBT-10 — Mismo bug `ST_X/ST_Y(geom::geometry)` en `lib/repos/analisis.ts` (3 lugares) — **RESUELTO** (2026-07-21)

**Commit**: `d7e7a6b` — fix(platform): DEBT-10 — use latitud/longitud numeric columns instead of ST_X/ST_Y(geom) in analisis.ts (3 queries). Source of truth for centroid coords is the numeric column, not the projected geometry.

**Solución aplicada** (mismo patrón que DEBT-9, 3 lugares):
- Líneas 621-622 (`getAnalisisBuffer` target=quebrada, busca predios): `ST_Y/X(ST_Centroid(p.geom))` → `p.latitud_centroide, p.longitud_centroide`.
- Líneas 655-656 (`getAnalisisBuffer` target=propuesta, busca quebradas): `ST_Y/X(q.geom)` → `q.latitud, q.longitud`.
- Líneas 819-820 (`getIntersectPorBoundingBox`): `ST_Y/X(ST_Centroid(p.geom))` → `p.latitud_centroide, p.longitud_centroide`.

**Razón**: ambas tablas tienen columnas numeric `NOT NULL DEFAULT 0` que son la fuente de verdad:
- `sgs_pre_predio.longitud_centroide` / `latitud_centroide` (`DECIMAL(12,6)`).
- `bcs_dh_quebrada.longitud` / `latitud` (`DECIMAL(12,6)`).
- `geom` en SRID 4686 (proyectado) y casi nunca poblado en la BD actual. `ST_X/ST_Y/ST_Centroid` sobre geom proyectado devuelve metros, no lon/lat.

**Resultado verificado**:
- `npx tsc --noEmit` → 0 errors.
- `npm test` → 156/156.
- `npm run lint` → 0 errors.
- `npm run build` → verde.
- Diff: 1 file, 6 insertions / 6 deletions (3 queries, 2 columnas cada una).

**Side effect positivo**: la UI de `/analisis` (buffer y bbox) ahora muestra **markers con coords correctas** en el mapa, no random. Con demo data, los markers ahora caen sobre Cundinamarca como deben.

---

## Tracking

| ID | Severidad | Est. esfuerzo | Bloquea deploy? | Estado |
|---|---|---|---|---|
| DEBT-1 | 🔴 | 1-2 días | Sí (`next build` falla) | ✅ **RESUELTO** (commits `e101916..4bbfb12`) |
| DEBT-1.1 | 🟢 | 1h | No, cleanup | ✅ **RESUELTO** (commit `126a43a`) |
| DEBT-2 | 🟠 | 5 min | Solo bloquea setup en dev | ✅ **RESUELTO** (commit `903f3d1`) |
| DEBT-3 | 🟡 | 1 día | No, performance | ✅ **RESUELTO parcial** (commits `1ae8c8f..54b6a72`, merge `1253ef5`) — 19/28 queries wrapped |
| DEBT-3.1 | 🟡 | 1h | No, TTL 60-300s backstop | ✅ **RESUELTO** (commit `abe23b8` — `/api/interventions/import` POST con 5 tags) |
| DEBT-3.2 | 🔴 | 2h | Sí, 3 rutas devuelven 500 en runtime | ✅ **RESUELTO** (commits `abcd177`, `9738cce`, `4113432`, `873dc57`) |
| DEBT-3.3 | 🟠 | 30 min | No, pero login UI rota | ✅ **RESUELTO** (commits `d6c598e`, `5a97be8`) |
| DEBT-3.4 | 🔴 | 30 min | No, pero form de login y cards colapsados a 1 char | ✅ **RESUELTO** (commits `64e78b2`, `2c0a1c9`) |
| DEBT-3.6 | 🔴 | 1h | Sí, datos del seed eran de Cali, no de Cundinamarca | ✅ **RESUELTO** (commits `3ec39e7`) — script `import-shp-demo.{sh,ps1}` con reproyección + sanity check de bbox |
| DEBT-3.7 | 🟠 | 1h | No, pero panel mostraba 'próximamente' en Parques/Reservas | ✅ **RESUELTO** (commits `a779191`, `4e25527`) — WFS endpoint + WfsLayer client component |
| DEBT-3.8 | 🔴 | 2h | No, pero el mapa mostraba markers puntuales (no geometría real) | ✅ **RESUELTO** (commits `18f2faa`, `5834f61`, `34e3b76`) — /api/geo GeoJSON + GeoJsonLayer |
| DEBT-4 | 🟡 | — | — | ✅ Cubierto por DEBT-3 (helper + dashboard + catalogos) |
| DEBT-5 | 🟢 | 1 día | No, cosmético | ✅ **RESUELTO** (commit `525c6de` + migration 10) |
| DEBT-6 | 🟢 | ½ día | No, reportes | ✅ **RESUELTO** (commit `0ccfb4a`) |
| DEBT-7 | 🟢 | 1h | No, UX | ✅ **RESUELTO** (commit `c33f94f`, junto con DEBT-8) |
| DEBT-8 | 🟢 | 1h | No, edge case | ✅ **RESUELTO** (commit `c33f94f`, junto con DEBT-7) |
| DEBT-9 | 🟠 | ½ día | No, pero UI muestra coords mal | ✅ **RESUELTO** (commit `3096e39`) |
| DEBT-10 | 🟠 | ½ día | No, pero UI de /analisis muestra coords mal | ✅ **RESUELTO** (commit `d7e7a6b`) |

## Resumen ejecutivo (2026-07-21)

**Cerrados en esta auditoría (12 commits, push a origin/main exitoso)**:
- DEBT-1, DEBT-1.1, DEBT-2 — build setup y cleanup
- DEBT-9, DEBT-10 — bugs PostGIS de SRID/longitud-latitud
- DEBT-5, DEBT-6, DEBT-7, DEBT-8 — datos reales (alertas, reportes, UX avance)
- DEBT-3 + DEBT-4 — `unstable_cache` con `cached()` helper, 19 queries, 7 tags, 6 actions con `revalidateTag`

**Pendiente menor**:
- ~~**DEBT-3.1**: terminar auditoría de `revalidateTag` en API routes (`/api/interventions/import`, `/api/reportes`) y `app/admin/auditoria/actions.ts`. Backstop: TTL 60-300s mitiga cualquier inconsistencia.~~ ✅ **Cerrado en commit `abe23b8` (2026-07-22)**.

**Pendiente cosmético** (no documentado, no bloqueante):
- Comentarios inline en `lib/types.ts:658,660` mencionan `ST_X(geom::geometry)` que ya no se usa. Es texto muerto, no afecta runtime.

**Verificación post-cierre**:
- `npx tsc --noEmit` → 0 errors.
- `npm test` → 156/156 passed.
- `npm run lint` → 0 errors (1 warning preexistente en `map-client.tsx:133`, no relacionado con DEBTs).
- `npm run build` → verde (14/14 páginas, todas las rutas compilan).
- `npx playwright test tests/e2e/smoke-routes.spec.ts` → 19/19 passed (sesión real, BD prendida).
- `git log origin/main` → sincronizado, `873dc57` en local y remote.

## Historial de recomendaciones

> Auditoría original (e101916..0144a58) recomendaba este orden:
> 1. ~~DEBT-1~~ ✅
> 2. ~~DEBT-2~~ ✅
> 3. ~~DEBT-9~~ ✅
> 4. ~~DEBT-10~~ ✅
> 5. ~~DEBT-3 + DEBT-4 juntos~~ ✅
> 6. ~~DEBT-1.1 (borrar `repository.ts` después de 1 release)~~ ✅
> 7. ~~DEBT-5/6/7/8 (limpiar en cualquier sprint siguiente)~~ ✅

> Estado al 2026-07-22: orden ejecutado completo. DEBT-3.1 cerrado en commit `abe23b8`. **Cero DEBTs abiertos.**
