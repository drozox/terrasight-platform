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
- `git log origin/main` → sincronizado, `1253ef5` en local y remote.

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
