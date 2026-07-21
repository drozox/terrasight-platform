# Tech Debt — TerraSight (post-MVP-1)

> Deuda técnica identificada durante la auditoría de MVP-1 y los fixes de `6dff742` (avance real) + `e101916..4bbfb12` (split de repository.ts). NO se resolvió junto con esos fixes por decisión de scope. Cada item es un PR aparte.

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
- `lib/repository.ts` (barrel de 3 líneas, deprecated pero mantenido 1 release).

**Documentación completa**: `platform/docs/refactor-2026-07-19-repository-split.md` (13 KB).

**Cleanup pendiente (DEBT-1.1)**: borrar `lib/repository.ts` y `TELEFONO_REGEX/isValidTelefono` (privado en `_helpers.ts`, no re-exportado del barrel, no es alcanzable desde el barrel). PR aparte.

---

## ✅ DEBT-2 — `npm run db:migrate` roto en `scripts/db-migrate.ps1` — **RESUELTO** (2026-07-21)

**Commit**: `903f3d1` — fix(platform): DEBT-2 — db-migrate.ps1 path resolution. Use PSScriptRoot/PSCommandPath and fix double Split-Path.

**Tenía DOS bugs encadenados**:
1. **Path null desde npm**: `$MyInvocation.MyCommand.Path` devuelve `$null` cuando se invoca con `npm run db-migrate` (npm spawns PowerShell con un contexto donde esa variable no se popula). `Split-Path -Parent $null` falla o devuelve string vacío.
2. **Doble `Split-Path -Parent`**: el script vive en `platform/scripts/`, pero el código original aplicaba `Split-Path -Parent` **dos veces**, asumiendo que vivía en `platform/scripts/db/`. Resultado: `$ProjectRoot` quedaba en `TG-Nikoll/` (raíz del repo) en vez de `TG-Nikoll/platform/`, y `$InitDir` apuntaba a `TG-Nikoll/scripts/db/init` (que no existe).

**Solución aplicada**:
- `$ScriptDir = if ($PSScriptRoot) { ... } elseif ($PSCommandPath) { ... }` (variables automáticas, siempre disponibles).
- `$ProjectRoot = Split-Path -Parent $ScriptDir` (una sola vez, no dos).
- Validación temprana: `if (-not (Test-Path $InitDir)) { throw ... }` para fallar con mensaje claro si el path está mal.

**Resultado verificado**:
- `powershell -File scripts/db-migrate.ps1` → ve los 8 archivos .sql correctamente, construye el comando `docker compose` con path absoluto, falla solo porque el daemon de Docker no está corriendo (problema de entorno, no del PS1).
- Antes: reportaba "Saltando (no existe)" para TODAS las migrations.

**Diff**: 1 file, 10 ins / 2 del.

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

**Síntoma**: corre sin error visible pero no aplica ninguna migration.

**Causa**: línea 13 del PS1 usa `$MyInvocation.MyCommand.Path` que devuelve `null` cuando se invoca desde npm. `Split-Path` falla. `Test-Path` ve todos los archivos `.sql` como inexistentes. El script termina OK sin aplicar nada.

**Workaround usado durante el fix de avance**: aplicar la migration 09 con `docker exec psql` directo.

**Fix correcto** (5 min):
```powershell
# Reemplazar $MyInvocation.MyCommand.Path por $PSCommandPath o $script:MyInvocation.MyCommand.Path
# o usar:
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $PSCommandPath }
```

**Verificación que es preexistente**: ningún commit reciente tocó `db-migrate.ps1` excepto `6dff742` que solo agregó la línea 09 al array `$ordered`. Bug existía antes.

---

## 🟡 DEBT-3 — Coverage UI "Avance" no se actualiza en dashboard tras `actualizarAvanceIntervencionAction`

**Síntoma**: si un GESTOR registra un avance real en una intervención desde `/intervenciones/[id]`, el cambio se ve en la ficha, pero la lista `/intervenciones` y la tabla del dashboard muestran el valor viejo hasta `router.refresh()` manual o navegación.

**Causa**: `app/intervenciones/actions.ts` llama `revalidatePath("/intervenciones")` y `revalidatePath(\`/intervenciones/${idPropuesta}\`)`. NO invalida el cache del dashboard (no hay cache aún, pero está implícito que cuando se sume `unstable_cache` se va a notar).

**Fix correcto** (cuando se implemente DEBT-4 abajo): agregar `revalidateTag("intervenciones:recientes")` en las 3 actions.

---

## 🟡 DEBT-4 — Sin `unstable_cache` en queries pesadas

**Queries candidatas** (en orden de impacto):
1. `getIntervencionesRecientes` (usada en dashboard + lista) — tag `intervenciones:recientes`, TTL 60s.
2. `getDashboardKpis` (usada en home + dashboard + RightPanel) — tag `dashboard:kpis`, TTL 60s.
3. `getComponentes` (usada en 5+ pages) — tag `catalogos:componentes`, TTL 5min.
4. `getFooterKpis` — tag `dashboard:footer`, TTL 60s.
5. `getPrediosPorMunicipio` (chart) — TTL 5min.

**Costo**: 1 día de coder + tests. Beneficio: -80% queries a BD en carga normal.

**No aplicado en `6dff742`** por decisión de scope (mismo PR que el fix de avance = scope creep). Aplica por separado.

---

## 🟢 DEBT-5 — Alertas hardcodeadas en `getAlertas()`

**Síntoma**: `/alertas` y el panel de notificaciones del topbar muestran las mismas 5 alertas ficticias desde 2024, sin importar el estado de la BD.

**Ubicación**: `repository.ts:255` — bloque de `getAlertas()` con array hardcodeado.

**Fix correcto** (1 día): crear tabla `sgs_amb_alerta` con `id_alerta`, `tipo`, `titulo`, `descripcion`, `created_at`, `estado` (`activa|descartada|resuelta`). Migración 10. UI sin cambios. El "DEMO" badge se puede agregar mientras tanto.

---

## 🟢 DEBT-6 — Avance % sin JOIN en reportes

**Síntoma**: R4 (Propuestas por predio) y R5 (Propuestas punto con beneficiarios) no incluyen el avance real.

**Causa**: queries armadas en `repository.ts` (función `getReporteR4`, `getReporteR5`) no Joinean a `sgs_pro_propuesta_avance`. Solo muestran el `estado` que se sincroniza al 100%.

**Fix correcto** (½ día): mismo patrón que `getIntervencionesRecientes` — `LEFT JOIN LATERAL` con `WHERE es_backfill = FALSE ORDER BY created_at DESC LIMIT 1` y agregar columna `avance_pct` a la salida CSV.

---

## 🟢 DEBT-7 — Avance form no avisa que "0%" se va a registrar al primer submit

**Síntoma**: cuando un gestor entra a `/intervenciones/[id]` con una propuesta sin avance real (todo el dataset post-deploy), el slider arranca en 0. Si aprieta "Registrar avance" sin tocarlo, se crea un evento con `avancePct = 0` y el sistema lo muestra como "0% — registrado".

**Fix correcto** (UX, 1h): microcopy o botón "Marcar como Pendiente" en lugar del slider cuando no hay avance previo, o default a un valor "razonable" (ej. 5%).

---

## 🟢 DEBT-8 — Avance form: `useState<number>(avanceActual ?? 0)` pierde la pista del null

**Síntoma**: en `avance-form.tsx`, el local state `pct` se inicializa a `0` cuando `avanceActual` es `null`. El form ya no sabe si "0" viene del null original o si el usuario lo seleccionó a propósito.

**Fix correcto** (1h): separar `pct: number | null` del "valor inicial" hasta que el usuario interactúe.

---

## Tracking

| ID | Severidad | Est. esfuerzo | Bloquea deploy? | Estado |
|---|---|---|---|---|
| DEBT-1 | 🔴 | 1-2 días | Sí (`next build` falla) | ✅ **RESUELTO** (commits `e101916..4bbfb12`) |
| DEBT-1.1 | 🟢 | 1h | No, cleanup | Pendiente (commit 5 del refactor) |
| DEBT-2 | 🟠 | 5 min | Solo bloquea setup en dev | ✅ **RESUELTO** (commit `903f3d1`) |
| DEBT-3 | 🟡 | 1h | No, va a aparecer con DEBT-4 | Pendiente |
| DEBT-4 | 🟡 | 1 día | No, performance | Pendiente |
| DEBT-5 | 🟢 | 1 día | No, cosmético | Pendiente |
| DEBT-6 | 🟢 | ½ día | No, reportes | Pendiente |
| DEBT-7 | 🟢 | 1h | No, UX | Pendiente |
| DEBT-8 | 🟢 | 1h | No, edge case | Pendiente |
| DEBT-9 | 🟠 | ½ día | No, pero UI muestra coords mal | ✅ **RESUELTO** (commit `3096e39`) |
| DEBT-10 | 🟠 | ½ día | No, pero UI de /analisis muestra coords mal | ✅ **RESUELTO** (commit `d7e7a6b`) |

**Recomendación de orden**:
1. ~~DEBT-1~~ ✅
2. ~~DEBT-2~~ ✅
3. ~~DEBT-9~~ ✅
4. ~~DEBT-10~~ ✅
5. DEBT-3 + DEBT-4 juntos (cuando implementes cache)
6. DEBT-1.1 (borrar `repository.ts` después de 1 release)
7. DEBT-5/6/7/8 (limpiar en cualquier sprint siguiente)
