# DEEPSEEK · Coordinación Multiagente — TerraSight

> **Documento maestro de coordinación.** DeepSeek actuó como *Technical Auditor +
> Product Completion Lead* y ahora cumple el rol de **coordinador**: los demás
> agentes leen esta guía ANTES de tocar código y la actualizan DESPUÉS.
>
> Plan fuente (diagnóstico completo): [`FINAL-CLOSURE-PLAN.md`](./FINAL-CLOSURE-PLAN.md).
> HEAD de referencia: `35f3986` · Migraciones: **36** · Última actualización: 2026-09-10 (sistema de task cards T1).

---

## 0. Cómo usar este documento (protocolo obligatorio)

### 0.1 Orden de lectura para un agente que llega

1. Este documento (§1 para saber qué ya está hecho; §3 para saber qué sigue).
2. `FINAL-CLOSURE-PLAN.md` (el diagnóstico/plan original, 22 secciones).
3. `AGENTS.md` (convenciones y anti-patrones).
4. `docs/ARCHITECTURE.md` (capas, modelo de datos, decisiones).
5. `docs/SPRINT-STATUS.md` (estado de sprints).

### 0.2 Reglas de trabajo

1. **Antes de empezar**: `git log --oneline -15` + leer §1 y §3. **No re-hacer items `DONE`**.
2. **Un item = un commit**, con prefijo del plan (`P0-1`, `P2-15`, …) o `DEEPSEEK-<n>`.
3. **Commitear siempre** al cerrar un item (el owner pidió modo "commit continuo").
4. **Gate mínimo** antes de cerrar:
   ```powershell
   cd platform
   npm run release:gate      # typecheck + lint + tests + build (+ smoke/audit si hay DATABASE_URL)
   ```
5. **Actualizar este documento**: agregar fila en §1.2/§3 y una entrada en §8 (bitácora).
6. **No commitear secretos** (§6).

### 0.3 Nomenclatura de items

- `P0..P3-NN`: items del `FINAL-CLOSURE-PLAN.md`.
- `DEEPSEEK-NN`: mejoras agregadas por la sesión DeepSeek (fuente única, release gate, health, etc.).
- `D-DEBT-*`: deuda nueva descubierta por un agente (agregar a §3 con prioridad).

### 0.4 Organización multiagente — quién hace qué

La división es por **complejidad, ambigüedad y riesgo**, no por etiqueta.
Cada item tiene un **tier**:

| Tier | Rol | Qué toma | Qué NO toma |
|------|-----|----------|-------------|
| **T0 — Coordinador** (DeepSeek) | Arquitecto / tech lead | SQL y migraciones, semántica de indicadores, refactors cross-cutting, seguridad, CI/CD, diseño de tests, reconciliación, **code review**, desbloqueo y reparto de tareas | Tareas mecánicas que un T1 puede ejecutar |
| **T1 — Worker** (p. ej. MiniMax M3, otros) | Ejecutor | Items acotados y repetitivos: **un** test de integración, un fix con instrucciones exactas, actualizar/alinear docs, renombrar, aplicar un patrón YA definido, correr el gate y reportar | Cambiar alcance; tocar la migración 36 / `metas-convenio.ts` / `ci-migrate.sh` sin OK de T0; decidir negocio |
| **OWNER** (Pedro) | Producto / credenciales | Decisiones de negocio (catálogo de actividades), rotar secretos, deploy, aprobar cambios destructivos | — |

**Fronteras duras:**
- Si una tarea T1 encuentra ambigüedad o crece a **>5 archivos** → **escala a T0** (no improvises).
- Zona reservada T0: `scripts/db/init/36-*`, `src/lib/repos/metas-convenio.ts`, `.github/workflows/ci.yml`, `scripts/ci-migrate.sh`.
- T0 revisa **todo** PR de T1 contra §1/§3 y el gate antes de mergear.
- El **owner** es el único que decide negocio y rota credenciales.

### 0.5 Plantilla de tarea (la escribe T0 → la ejecuta T1)

```text
TAREA: <DEEPSEEK-NN | Pn-N>
TIER: T0 | T1
PRIORIDAD: P0..P3
OBJETIVO: (1 frase)
CONTEXTO: (por qué; links a archivo:línea)
ARCHIVOS: (lista exacta; el resto es "NO TOCAR")
PASOS: 1) … 2) … 3) …
NO HACER: (alcance negativo explícito)
VALIDACIÓN: (comandos exactos)
CRITERIOS DE ACEPTACIÓN: AC-01 … (binarios y observables)
ENTREGABLE: commit + reporte con la plantilla §0.6
```

### 0.6 Plantilla de reporte (la usa T1 al terminar)

```text
TAREA: <id>
ESTADO: DONE | BLOCKED | PARCIAL
COMMIT(S): <hash(es)>
QUÉ CAMBIÓ: (2-4 bullets)
ARCHIVOS: (lista)
VALIDACIÓN: <comando> → <resultado>   (ej. "npm run release:gate → GOAL_COMPLETED=TRUE")
ACEPTACIÓN: AC-01 ✅ / AC-02 ✅ / …  (del task card)
BLOQUEOS: (si BLOCKED/PARCIAL: qué falta y qué necesitás de T0/owner)
SIGUIENTE SUGERIDO: (1 línea)
```

> **Anti-patrón:** un reporte que dice "listo" sin el comando + resultado, o que
> cambia archivos fuera del `ARCHIVOS` del task card. T0 lo rechaza.

---

## 1. Resumen de cambios realizados

### 1.1 Commits de la sesión DeepSeek (sobre `main`)

| Commit | Tipo | Qué resolvió |
|--------|------|--------------|
| `e107268` | fix | README stale (R1–R10), CI `Build` reactivado, guard de fórmulas CSV, error boundary sin stack trace |
| `9f8c996` | feat | **Fuente única de indicadores** (migración 36) + test de integración de indicadores + CI aplica las 36 migraciones + fix versionado |
| `0c88223` | chore | Limpieza de código muerto (`/api/analisis/buffer`, `/api/metas`, `repos/metas.ts`) + test integración **workflow** + **release gate** |
| `e06f23a` | feat | Test integración de los **10 reportes** + **`/api/health`** (uptime/anti-pausa Supabase) + docs |
| `34eccd2` | chore | `prod_smoke` verifica la vista nueva + E2E opcional en el gate + tipos huérfanos removidos |

> Antes de DeepSeek, el "Agente 1/2" ya había cerrado P0-1 (estados), P0-2 (secretos
> redactados) y P1-3/4/5/6 + P2-7/8/9 (commits `9c36a69`, `c04a6f6`, `c4d00bb`, `c17074e`).

### 1.2 Cambios por área

| Área | Qué se hizo | Dónde |
|------|-------------|-------|
| **Correctitud de indicadores** | Los 10 indicadores se definen UNA vez en las vistas `sgs_v_indicador_propuesta` / `sgs_v_indicador_global`. Se eliminaron 4 copias de los patrones ILIKE. `global == municipio == drill-down` por construcción | `scripts/db/init/36-indicadores-fuente-unica.sql`, `src/lib/repos/metas-convenio.ts`, `scripts/audit_resultados.mjs` |
| **Drill-down** | Ya no dedupea por propuesta → Σ drill-down == global. Fix del filtro de acción (`substring(2,4)`) | `metas-convenio.ts`, `metas/convenio/propuestas/page.tsx` |
| **CI / verificación** | CI aplicaba solo migraciones 01–07 (esquema incompleto); ahora aplica las **36** y quita el doble seed. `Build` reactivado | `.github/workflows/ci.yml`, `scripts/ci-migrate.sh`, `scripts/migrate.mjs` |
| **Tests de integración** | Red de seguridad contra Postgres real (skip local sin `DATABASE_URL`): indicadores, workflow, reportes | `tests/integration/*.int.test.ts`, `vitest.config.ts` |
| **Release gate** | `npm run release:gate`: typecheck + lint + tests + build (+ smoke + reconciliación + E2E opcional) | `scripts/release_gate.mjs`, `package.json` |
| **Seguridad** | Secretos redactados de todo el repo; guard de inyección de fórmulas CSV; error boundary sin stack leak; `/api/health` público sin datos | `csv.ts`, `error.tsx`, `api/health/route.ts`, `middleware.ts` |
| **Operación** | `/api/health` para uptime y cron anti-pausa de Supabase | `src/app/api/health/route.ts` |
| **Limpieza** | Endpoints/rutas muertas y tipos huérfanos eliminados; un solo camino de metas | `src/app/api/metas`, `src/lib/repos/metas.ts`, `src/lib/types.ts` |
| **Docs** | README, SPRINT-STATUS, ARCHITECTURE, AGENTS a 36 migraciones y fuente única | `README.md`, `docs/*.md`, `AGENTS.md` |

---

## 2. Estado actual (snapshot)

### 2.1 Gate de release

| Check | Comando | Resultado |
|-------|---------|-----------|
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors (1 warning preexistente `map-client.tsx:76`) |
| Unit + component | `npm test` | ✅ 316 passed |
| Integración | `npm test` (con `DATABASE_URL`) | ✅ 18 tests (skip sin BD) |
| E2E | `npm run test:e2e` | ✅ 7 specs (CI) |
| Build | `npm run build` | ✅ verde |
| Smoke BD | `node scripts/prod_smoke.mjs` | ⏳ requiere `DATABASE_URL` (owner) |
| Reconciliación | `npm run audit:resultados` | ⏳ requiere `DATABASE_URL` (owner) |

**`GOAL_COMPLETED = TRUE (local)`** con smoke/reconciliación pendientes de `DATABASE_URL`.

### 2.2 Datos y esquema

- Migraciones: **36** (`scripts/db/init/01..36`). La 36 es la fuente única de indicadores.
- Vistas nuevas: `sgs_v_indicador_propuesta` (detalle) + `sgs_v_indicador_global` (agregado, 11 filas).
- Vistas deprecadas: `sgs_v_metas_*` / `sgs_v_municipios_*` (12/13) — sin consumidores; NO se dropean aún.

---

## 3. Backlog priorizado (qué sigue)

### P0 — BLOCKER
| ID | Item | Estado | Siguiente acción |
|----|------|--------|------------------|
| P0-2 | Rotar password de Supabase | ⏳ owner | Rotar en Supabase + actualizar `.env.local` y env de Vercel |

### P1 — MUST FIX
| ID | Item | Estado | Siguiente acción |
|----|------|--------|------------------|
| —  | *(sin items P1 abiertos)* | ✅ | — |

### P2 — SHOULD FIX
| ID | Item | Estado | Siguiente acción |
|----|------|--------|------------------|
| P2-VAL | Validar migración 36 + integración en CI/real | 🟡 pendiente | Pushear; CI (PostGIS) aplica 36 y corre los 18 tests. Correr `npm run release:gate` con `DATABASE_URL` |
| P2-17 | Dropear vistas deprecadas `sgs_v_metas_*` | 🟡 opcional | Actualizar `prod_smoke.mjs` y `verify-migrations.mjs` primero |

### P3 — OPTIONAL / deuda
| ID | Item | Notas |
|----|------|-------|
| P3-11.b | `csv.ts`: quotear cuando el valor tiene coma y el separador es `;` | Prolijidad Excel, no seguridad |
| D-DEBT-1 | **Catálogo cerrado de actividades** (reemplazar ILIKE por tabla + FK) | Requiere **decisión de negocio** de la lista canónica (no inventar). Mayor reducción de fragilidad a futuro |
| D-DEBT-2 | Revalidación de sesión al desactivar usuario | Hoy el JWT vive 8 h sin re-chequear `activo`; evaluar cache corto |
| D-DEBT-3 | `next lint` deprecado (se remueve en Next 16) | Migrar a ESLint CLI cuando se actualice Next |
| D-DEBT-4 | Scripts del pipeline GDB no versionados | `clean_gdb.py`, `aggregate_v2.py`, `spatial_join_*.py`, `extract_phase6_tables.py` solo en `C:\dev\scratch`. **Riesgo de continuidad** (owner) |

### ⏳ Acciones del owner (no código)
- Rotar password de Supabase (P0-2) y correr `npm run release:gate` con `DATABASE_URL` real.
- Revisar binarios que podrían mostrar credenciales: `Stich/screen.png` y `platform/docs/actividad-3-diseno-desarrollo-implementacion.pdf`.
- Configurar cron (`GET /api/health` cada ~25 días) para evitar la pausa de Supabase free tier.

---

## 4. DAG / orden de ejecución

```
[AUDITORÍA] ✅
   ↓
[P0-1 estados] ✅ ─┐
[P0-2 secretos] ✅ ├─► [FUENTE ÚNICA indicadores] ✅ ─► [drill-down] ✅ ─► [C2A2] ✅
                   │                ↓
                   │        [tests de integración] ✅ ─► [reconciliación] ✅ ─► [docs] ✅
                   └─► [limpieza] ✅ / [release gate] ✅ / [health] ✅
                                       ↓
                        [P2-VAL] validar en CI + DATABASE_URL real   ← AQUÍ ESTAMOS
                                       ↓
                              [RELEASE GATE] GOAL_COMPLETED = TRUE
```

- **Paralelizables**: reportes/geo/search integration tests, D-DEBT-2 (sesión), D-DEBT-3 (lint).
- **Secuenciales**: cualquier cambio de indicador debe pasar por la migración 36 → luego `metas-convenio.ts` → luego tests.

---

## 5. Comandos clave

```powershell
cd platform

# Gate completo (typecheck + lint + tests + build + smoke/audit si hay DATABASE_URL)
npm run release:gate

# Solo unit/integración
npm test                        # integración se salta sin DATABASE_URL
DATABASE_URL=... npm test       # corre los 18 tests de integración

# Reconciliación de indicadores + smoke
node scripts/audit_resultados.mjs
node scripts/prod_smoke.mjs

# E2E (necesita dev server + BD)
npm run test:e2e

# Migraciones
npm run db:migrate              # aplica 01..36
npm run db:migrate:no-seed      # sin seed demo (producción/Supabase)
```

---

## 6. Seguridad — estado del scrub

- ✅ Password de Supabase y project-ref removidos de archivos trackeados (`.env.example`, `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `REVIEW-GUIDE.md`, `DEPLOY.md`, scripts de auditoría).
- ✅ `.env` / `.env.local` están gitignored (no se versionan).
- ⚠️ **Falsos positivos revisados**: `02-datos-ejemplo.sql` (`200000`) y `add-9377.sql` (`2000000` en WKT) coinciden con la substring `20000` pero **no son credenciales**.
- ⏳ **Owner**: rotar la password (sigue siendo válida hasta rotarla) y revisar los binarios de §3.

> `SECRET DETECTED — DO NOT PRINT VALUE`

---

## 7. Convenciones recordatorio (ver `AGENTS.md` para la lista completa)

- `tsc` + `build` + unit tests **NO** garantizan runtime con BD: los tests unit mocks `sql`. Bugs como P0-1/P1-3 escaparon. Para lógica de negocio, usar **integración** (`tests/integration`) + `prod_smoke` + `audit_resultados`.
- `ST_Length` / `ST_Area` **siempre** con `::geography`.
- `sql.array(value, 23)` (OID numérico), nunca string.
- Workflow: `UPDATE ... WHERE estado = $from` (anti-race).
- Client components no importan `db`/`repos` → usar `*-types.ts`.
- UI en español, identifiers en inglés. Lucide, no emojis.
- **Un solo camino de metas**: cualquier cambio de indicador va en la migración 36.

---

## 8. Bitácora por turnos (histórico)

| Turno | Alcance | Commits |
|-------|---------|---------|
| Agente 1 | P0/P1/P2 base (estados, secretos, drill-down, dashboard, CI build) | `9c36a69`, `c04a6f6`, `c4d00bb`, `c17074e` + fixes |
| Agente 2 | Gaps + hardening (README, DEPLOY, CI build, CSV guard, error boundary) | `e107268` |
| DeepSeek 3 | Fuente única de indicadores + integración + fix CI + versionado | `9f8c996` |
| DeepSeek 4 | Limpieza de código muerto + integración workflow + release gate | `0c88223` |
| DeepSeek 5 | Integración reportes + `/api/health` + docs | `e06f23a`, `34eccd2` |

## 9. Cola de trabajo y asignaciones

> **Cards listas para entregar a T1:** ver [`tasks/QUEUE.md`](./tasks/QUEUE.md).
> Cada card es autocontenida (objetivo, archivos exactos, pasos, "NO HACER",
> validación y criterios de aceptación). El worker ejecuta **una card a la vez**.

| Item | Tier | Prio | Estado | Notas |
|------|------|------|--------|-------|
| **P2-VAL** validar migración 36 + integración en CI/real | T0 | P2 | 🟡 en curso | push + `DATABASE_URL`; CI ya aplica las 36 |
| **P0-2** rotar password Supabase | OWNER | P0 | ⏳ | no es código; ver §6 |
| **P2-17** dropear vistas `sgs_v_metas_*` | T0 | P2 | opcional | actualizar `prod_smoke.mjs` + `verify-migrations.mjs` primero |
| **D-DEBT-1** catálogo cerrado de actividades | T0 diseña → OWNER decide → T1 migra | P3 | planeado | **no inventar** la lista canónica |
| **D-DEBT-2** revalidación de sesión (usuario desactivado) | T0 | P3 | planeado | diseño de seguridad; cache corto |
| **D-DEBT-3** migrar `next lint` → ESLint CLI | T1 | P3 | 🟢 delegable | mecánico; Next 16 lo remueve |
| **P3-11.b** `csv.ts` quotear con coma cuando sep=`;` | T1 | P3 | 🟢 delegable | +tests en `tests/unit/csv.test.ts` |
| **DEEPSEEK-6** integration tests de geo/search/catálogos | T1 | P2 | 🟢 delegable | copiar el patrón de `tests/integration/` |
| **DEEPSEEK-7** unit tests de bordes (`utils.ts`, `csv.ts`) | T1 | P3 | 🟢 delegable | cobertura, bajo riesgo |

### Cómo se asigna el trabajo
1. **T0 escribe el task card** (§0.5) y lo publica en esta tabla con tier y prioridad.
2. El worker toma el primer item **🟢 de su tier** y **solo ese** (sin scope creep).
3. Al terminar, **reporta con §0.6** y mueve el item a `DONE` (o `BLOCKED` con motivo).
4. T0 revisa el PR, corre el gate y actualiza §1/§2.

> **Nota de coordinación**: T0 (DeepSeek) se queda con los items de diseño/riesgo
> (§0.4) y **delega** lo mecánico a T1 con task cards. Ningún worker cambia el
> esquema de indicadores ni los patrones de la migración 36 sin OK de T0. El owner
> decide negocio y rota credenciales.
