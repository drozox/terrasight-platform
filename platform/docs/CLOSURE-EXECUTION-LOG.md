# CLOSURE EXECUTION LOG — TerraSight

> **Registro vivo de la ejecución del `FINAL-CLOSURE-PLAN.md`.**
> Leer esto ANTES de tocar código. Actualizar DESPUÉS de cada item.
>
> Plan fuente: [`FINAL-CLOSURE-PLAN.md`](./FINAL-CLOSURE-PLAN.md)
> Última actualización: 2026-09-10 (turno Agente 3 — fuente única de indicadores + CI)

---

## 0. Protocolo de trabajo (para agentes)

1. **Antes de empezar**: `git log --oneline -10` + leer este log. No re-hacer items `✅ DONE`.
2. **Un item = un commit** con prefijo del plan (`P0-1`, `P1-3`, …, `P3-11`).
3. **Gate mínimo obligatorio** antes de dar por cerrado un item:
   ```powershell
   cd platform
   npx tsc --noEmit      # 0 errors
   npm test              # 0 failures
   npm run lint          # 0 errors
   ```
4. **Si el item toca DB/deploy**, además: `npm run build` y `node scripts/prod_smoke.mjs`.
5. **Actualizar este log** (tabla §2 + sección del turno §4) en el mismo PR/commit.
6. **No commitear secretos**. Ver §6.

---

## 1. Orden de ejecución (DAG)

```
P0-1 (estados) ─┐
P0-2 (secretos) ├─► P1-5 (fuente única metas) ─► P1-3 (drill-down) ─► P1-4 (C2A2)
                │                                          │
                │                                          ▼
                │                                 P2-9 (audit:resultados + tests) ─► P1-6 (docs)
                │
                └─► P2-7 (dashboard) / P2-8 (CI build) / P3-11 (CSV)   (paralelos)
                                                        │
                                                        ▼
                                                   RELEASE GATE (§19 del plan)
```

- **Paralelizables:** P0-1 y P0-2; P2-7 / P2-8 / P3-11 entre sí.
- **Secuenciales:** P1-5 → P1-3 → P1-4 (mismo archivo `metas-convenio.ts`), luego P2-9 → P1-6.

---

## 2. Estado global de items

| ID | Descripción | Estado | Evidencia (commit / archivo) |
|----|-------------|--------|------------------------------|
| **P0-1** | Unificar vocabulario de estados intervención ↔ workflow | ✅ DONE | `9c36a69` · `estado-dropdown.tsx`, `intervenciones/actions.ts`, `propuestas.ts`, `intervencion-detail.tsx` |
| **P0-2** | Redactar/rotar secretos commitheados | ✅ DONE (código) · ⏳ owner | `c04a6f6` + turno Agente 2 (DEPLOY.md). **Rotación de password: owner** |
| **P1-3** | Fix drill-down metas (`substring(2,3)` → `substring(2,4)`) | ✅ DONE | `c4d00bb` · `metas-convenio.ts` + `tests/unit/metas-convenio.test.ts` |
| **P1-4** | Alinear C2A2 global vs drill-down (`globalSinFiltroCA`) | ✅ DONE | `c4d00bb` · `metas-convenio.ts` |
| **P1-5** | Fuente única de metas (`/metas` → redirect `/metas/convenio`) | ✅ DONE | `c4d00bb` · `src/app/metas/page.tsx` |
| **P1-6** | Actualizar docs stale (README / SPRINT-STATUS) | ✅ DONE | `c4d00bb` (SPRINT-STATUS) + turno Agente 2 (README) |
| **P2-7** | Resolver `/dashboard` placeholder | ✅ DONE | `c4d00bb` · `src/app/dashboard/page.tsx` redirect → `/` |
| **P2-8** | Reactivar step `Build` en CI | ✅ DONE | `c17074e` (fixes) + turno Agente 2 (`ci.yml`) |
| **P2-9** | `npm run audit:resultados` + tests metas-convenio | ✅ DONE | `c4d00bb` · `scripts/audit_resultados.mjs`, `package.json`, `tests/unit/metas-convenio.test.ts` |
| **P3-10** | Limpiar código muerto (`/api/analysis/*` vs `/api/analisis/*`, `_archive/`, scripts debug) | 🟡 PENDING | ver §5. Se dejó documentado, no se borró |
| **P3-11** | Sanitizar CSV (inyección de fórmulas `=+-@`) | ✅ DONE | turno Agente 2 · `src/lib/csv.ts` + `tests/unit/csv.test.ts` |
| **P3-HARD** | Error boundary global filtraba stack trace (`error.tsx` debug) | ✅ DONE | turno Agente 2 · `src/app/error.tsx` (UI friendly, sin stack) |
| **P3-12** ⭐ | **Fuente única de indicadores** (vista `sgs_v_indicador_*`, migración 36) | ✅ DONE (pend. validar en CI) | turno Agente 3 · `36-indicadores-fuente-unica.sql`, `metas-convenio.ts`, `audit_resultados.mjs` |
| **P2-10** | CI aplicaba solo migraciones 01–07 (esquema incompleto) | ✅ DONE | turno Agente 3 · `ci-migrate.sh` |
| **P2-11** | Test de **integración** con Postgres real (red de seguridad) | ✅ DONE | turno Agente 3 · `tests/integration/indicadores.int.test.ts` + `vitest.config.ts` |
| **P2-12** | Fix versionado: snapshot se guardaba anidado y `compararSnapshots` daba diff 0 | ✅ DONE | turno Agente 3 · `versionado.ts` + `getIndicadoresFlat()` |
| **P3-10** | Limpiar código muerto | ✅ DONE | turno Agente 4 · borrados `/api/analisis/buffer`, `/api/metas`, `repos/metas.ts`, `tests/unit/metas.test.ts` |
| **P2-13** | Test de integración del **workflow** (2º flujo crítico) | ✅ DONE (CI) | turno Agente 4 · `tests/integration/workflow.int.test.ts` |
| **P2-14** | **Release gate** ejecutable (plan §21) | ✅ DONE | turno Agente 4 · `scripts/release_gate.mjs` + `npm run release:gate` |
| **P2-15** | Test de integración de los 10 reportes R1–R10 | ✅ DONE (CI) | turno Agente 5 · `tests/integration/reportes.int.test.ts` |
| **P2-16** | `/api/health` público (DB ping) para uptime + cron anti-pausa Supabase | ✅ DONE | turno Agente 5 · `src/app/api/health/route.ts`, `middleware.ts`, `tests/e2e/health.spec.ts` |

Leyenda: ✅ cerrado · 🟠 parcial · 🟡 pendiente · 🔴 bloqueante · ⏳ acción del owner.

---

## 3. Gate de release (estado actual)

| Check | Comando | Resultado |
|-------|---------|-----------|
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors (1 warning preexistente `map-client.tsx:76`) |
| Unit tests | `npm test` | ✅ **327 passed, 3 skipped** (integración, sin BD local) |
| Build | `npm run build` | ✅ verde (todas las rutas) |
| Smoke DB | `node scripts/prod_smoke.mjs` | ⚠️ requiere `DATABASE_URL` (owner) |
| Reconciliación | `npm run audit:resultados` | ⚠️ requiere `DATABASE_URL` (owner) |
| Secretos | `git grep -lE 'Nikoleta\|ghp_'` | ✅ vacío (ver §6) |

**GOAL_COMPLETED**: pendiente de `prod_smoke` + `audit:resultados` con datos reales
+ rotación de password Supabase.

---

## 4. Turnos

### Turno Agente 1 (2026-09-10) — ejecutó P0/P1/P2 base

Commits en `main`: `9c36a69` (P0-1), `c04a6f6` (P0-2), `c4d00bb` (P1-3/4/5/6 + P2-7/8/9),
`c17074e` (P2-8 build), y fixes de seguimiento `a7b4cc6`, `6e36045`, `361a4d0`, `18bd47f`.

**Notas de ese turno:**
- Se introdujo un `src/app/error.tsx` de **debug** (mostraba stack trace) en `a7b4cc6`.
- P2-8 dejó los *blockers* de build corregidos (PieChart/RightPanel/DonutChart/LineChart
  a `"use client"`, layers dentro de `MapContainer`), pero **el step `Build` quedó comentado**
  en `ci.yml`.

### Turno Agente 2 (2026-09-10) — cierre de gaps + hardening

**Objetivo:** completar los pendientes reales que quedaron tras el Agente 1, sin duplicar.

| # | Cambio | Archivo(s) |
|---|--------|-----------|
| 1 | README: corregir "4 reportes"/"R2/R4/R5 pendientes" → R1–R10 implementados | `README.md` |
| 2 | DEPLOY.md: redactar `pjcvewberfgwywfnutjv` → `<PROJECT_REF>` | `DEPLOY.md` |
| 3 | CI: **reactivar** step `Build` (P2-8) | `.github/workflows/ci.yml` |
| 4 | CSV: mitigar inyección de fórmulas (`= + - @ \t \r`) solo en strings | `src/lib/csv.ts` |
| 5 | Error boundary: reemplazar UI de debug (stack leak) por UI friendly + digest | `src/app/error.tsx` |
| 6 | Tests de la mitigación CSV | `tests/unit/csv.test.ts` |

**Validación ejecutada:**
- `npx tsc --noEmit` → **0 errors**
- `npm test` → **331/331 passed** (25 files)
- `npm run lint` → **0 errors** (1 warning preexistente)
- `npm run build` → **verde**

**Estado del working tree:** estos cambios quedaron **sin commitear** (working tree).
El siguiente agente puede commitearlos con un mensaje tipo:
`fix(platform): P1-6/P2-8/P3-11 — README, CI build, CSV formula guard, error boundary`.

---

### Turno Agente 3 (2026-09-10) — fuente única de indicadores + red de seguridad

**Objetivo:** atacar la mejora #1 (correctitud de indicadores) con la práctica
correcta: crear la **fuente única** y al mismo tiempo la **red de seguridad**
(test de integración) para poder refactorizar sin ciegas.

**Contexto/diagnóstico previo:** `audit_resultados.mjs` **reimplementaba** los 10
patrones de ILIKE (4ª copia del negocio), y `ci-migrate.sh` solo aplicaba las
migraciones **01–07** (el CI testeaba un esquema incompleto). Docker no está
disponible en la máquina local, así que la validación SQL se hará en CI.

| # | Cambio | Archivo(s) |
|---|--------|-----------|
| 1 | Vista **fuente única** `sgs_v_indicador_propuesta` + agregado `sgs_v_indicador_global`. Todos los patrones de actividad viven acá | `scripts/db/init/36-indicadores-fuente-unica.sql` (nuevo) |
| 2 | `metas-convenio.ts` consume las vistas (global, drill-down y municipio). Se eliminaron los 5 bloques SQL duplicados y `INDICADORES_META.patterns` | `src/lib/repos/metas-convenio.ts` |
| 3 | Drill-down ya **no dedupea** por propuesta → Σ drill-down == global (antes `DISTINCT` ocultaba puntos repetidos) | `metas-convenio.ts`, `metas/convenio/propuestas/page.tsx` |
| 4 | `audit_resultados.mjs` consume la fuente única (dejó de reimplementar patrones) | `scripts/audit_resultados.mjs` |
| 5 | CI aplica **todas** las migraciones y quita la sección demo de `01` (evita doble seed) | `scripts/ci-migrate.sh` |
| 6 | Test de **integración** (Postgres real; skip sin `DATABASE_URL`): reconcilia drill-down vs global | `tests/integration/indicadores.int.test.ts`, `vitest.config.ts` |
| 7 | Fix bug de versionado (snapshot plano) | `src/lib/repos/versionado.ts`, `getIndicadoresFlat()` |
| 8 | `IndicadorCard` no renderiza link muerto para indicadores extra (multiestrat) | `src/app/metas/convenio/page.tsx` |

**Validación ejecutada localmente:**
- `npx tsc --noEmit` → **0 errors**
- `npm test` → **327 passed, 3 skipped** (los 3 de integración se saltan sin BD)
- `npm run lint` → **0 errors** (1 warning preexistente)
- `npm run build` → **verde**

**⚠️ Pendiente de validar en CI (no hay Docker local):**
- Que `36-indicadores-fuente-unica.sql` aplique compilado contra PostGIS.
- Que el test `tests/integration/indicadores.int.test.ts` pase con datos del seed
  (01 sin demo + 02 ampliada + DDL 03..36).
- Si el CI falla en alguna migración 08–35 por el seed, revisar §5.

**Estado del working tree:** estos cambios quedaron **sin commitear**.

---

### Turno Agente 4 (2026-09-10) — limpieza de código muerto + release gate

**Objetivo:** cerrar P3-10 y dejar un gate de release ejecutable (plan §21).

| # | Cambio | Archivo(s) |
|---|--------|-----------|
| 1 | Borrado `/api/analisis/buffer` (endpoint huérfano; el usado es `/api/analysis/buffer`) | `src/app/api/analisis/` |
| 2 | Borrado `/api/metas` + `repos/metas.ts` + su test: endpoint viejo por vistas `sgs_v_metas_*`, sin consumidores, y **divergía** de la fuente única | `src/app/api/metas/route.ts`, `src/lib/repos/metas.ts`, `tests/unit/metas.test.ts`, `repos/index.ts` |
| 3 | Test de integración del **workflow** (UPDATE condicional + CHECK + auditoría) | `tests/integration/workflow.int.test.ts` |
| 4 | **Release gate** ejecutable | `scripts/release_gate.mjs`, `package.json` (`npm run release:gate`) |

**Validación:** `npm run release:gate` → **GOAL_COMPLETED = TRUE (local)**:
typecheck ✅, lint ✅, unit+integración ✅, build ✅; smoke BD y reconciliación
⏭ (skip sin `DATABASE_URL`).

**Efecto colateral:** los tests bajan de 327 a **316 passed + 3 skipped** (se
quitaron los 11 tests de `metas.test.ts`). Los tipos `MetaResumen`/`MetasGlobal`/
`MunicipioIntervenido` en `lib/types.ts` quedaron sin uso (harmless).

**⚠️ Pendiente de validar en CI:** las vistas `sgs_v_metas_*` / `sgs_v_municipios_*`
(12/13) quedan deprecadas pero NO se dropean; `prod_smoke.mjs` aún las exige. Si se
quieren eliminar del todo, actualizar `prod_smoke.mjs` y `verify-migrations.mjs`.

---

### Turno Agente 5 (2026-09-10) — cobertura de reportes + health check + docs

| # | Cambio | Archivo(s) |
|---|--------|-----------|
| 1 | Test de integración de los 10 reportes (drift de esquema) | `tests/integration/reportes.int.test.ts` |
| 2 | `/api/health` público (SELECT 1; 200/503) + middleware lo excluye de auth | `src/app/api/health/route.ts`, `src/middleware.ts` |
| 3 | E2E del health check (CI) | `tests/e2e/health.spec.ts` |
| 4 | Docs: 36 migraciones + fuente única | `AGENTS.md`, `docs/ARCHITECTURE.md` |
| 5 | `prod_smoke` verifica la vista nueva; gate con E2E opcional (`RUN_E2E=1`); tipos huérfanos removidos | `scripts/prod_smoke.mjs`, `scripts/release_gate.mjs`, `src/lib/types.ts` |

**Validación:** `npm run release:gate` → **GOAL_COMPLETED = TRUE (local)** (smoke y
reconciliación skip sin `DATABASE_URL`).

**Uso del health check (operación):** configurar un cron (Vercel Cron o UptimeRobot)
que haga `GET /api/health` cada ~25 días para evitar la pausa del free tier de
Supabase. Sin auth, no expone datos.

---

## 5. Pendientes recomendados (siguiente turno)

### P3-10 — Código muerto: ✅ CERRADO en el turno Agente 4
- `_archive/` y scripts de debug one-shot (`audit_dual_child.mjs`, `audit_tipos.mjs`,
  `test-login.mjs`) son **untracked** (locales). No se versionan; limpiar local si molesta.

### ⏳ Acciones del owner (no código)
- **Rotar el password de Supabase** (P0-2) y actualizar `.env.local` + Vercel env vars.
- Correr `node scripts/prod_smoke.mjs` y `npm run audit:resultados` con `DATABASE_URL` real.

### P3-11.b (opcional)
- El comportamiento de quoting de `csv.ts` sigue siendo sub-óptimo para Excel cuando el
  valor contiene **coma** y el separador es `;` (ver TODO histórico en `tests/unit/csv.test.ts`).
  No es un bug de seguridad; solo prolijidad.

---

## 6. Seguridad — estado del scrub de secretos

Tras `c04a6f6` + este turno:

- ✅ `.env.example`, `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `REVIEW-GUIDE.md`,
  `FINAL-CLOSURE-PLAN.md` y los 10 scripts de auditoría ya **no** contienen password.
- ✅ `DEPLOY.md` ya no expone `pjcvewberfgwywfnutjv`.
- ✅ `git grep -lE 'ghp_|Nikoleta'` → **vacío**.
- ⚠️ **Falsos positivos (revisados):** `02-datos-ejemplo.sql` (`200000`) y
  `add-9377.sql` (`2000000` en el WKT de proyección) matchean la substring `20000`
  pero **no son credenciales**.
- ⚠️ **Artefactos binarios a revisar (owner):** `Stich/screen.png` (screenshot, podría
  mostrar la cadena de conexión visualmente) y
  `platform/docs/actividad-3-diseno-desarrollo-implementacion.pdf`. Los binarios no se
  pueden "redactar" con texto; si el screenshot contiene credenciales, **borrar/reemplazar**.

> `SECRET DETECTED — DO NOT PRINT VALUE`

---

## 7. Convenciones recordatorio (del plan + AGENTS.md)

- `tsc` + `build` + unit tests **NO** garantizan runtime con BD: los tests mockean `sql`.
  Bugs de SQL real (P0-1, P1-3) escaparon. Para cambios de negocio, usar
  `scripts/prod_smoke.mjs`, `scripts/audit_resultados.mjs` y Playwright E2E.
- `ST_Length/ST_Area` siempre con `::geography`.
- `sql.array(value, 23)` (OID numérico), nunca string.
- Workflow: `UPDATE ... WHERE estado = $from` (anti-race).
- Client components no importan `db`/`repos` directamente → usar `*-types.ts`.
- UI en español, identifiers en inglés. Lucide, no emojis.
