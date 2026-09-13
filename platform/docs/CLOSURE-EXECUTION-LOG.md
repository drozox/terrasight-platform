# CLOSURE EXECUTION LOG — TerraSight

> **Registro vivo de la ejecución del `FINAL-CLOSURE-PLAN.md`.**
> Leer esto ANTES de tocar código. Actualizar DESPUÉS de cada item.
>
> Plan fuente: [`FINAL-CLOSURE-PLAN.md`](./FINAL-CLOSURE-PLAN.md)
> Última actualización: 2026-09-10 (turno Agente 2 — P1-6/P2-8/P3-11 + hardening)

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

Leyenda: ✅ cerrado · 🟠 parcial · 🟡 pendiente · 🔴 bloqueante · ⏳ acción del owner.

---

## 3. Gate de release (estado actual)

| Check | Comando | Resultado |
|-------|---------|-----------|
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors (1 warning preexistente `map-client.tsx:76`) |
| Unit tests | `npm test` | ✅ **331/331** |
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

## 5. Pendientes recomendados (siguiente turno)

### P3-10 — Código muerto (no bloqueante)
- `src/app/api/analisis/buffer/route.ts` **no está referenciado** por el cliente.
  El usado es `src/app/api/analysis/buffer` (`map-client.tsx:168`) y
  `src/app/api/analysis/spatial-select` (`map-client.tsx:246`).
  - El route `/api/analisis/buffer` tiene un comentario que dice ser para
    "integraciones externas". **Decisión tomada:** no borrar sin confirmar con el owner
    (posible contrato externo). Si se confirma que no hay consumidores → borrar.
- `platform/_archive/` (`.next-bad3`, `.next-build`, `.next-pre`) — untracked, borrar local.
- `platform/scripts/audit_dual_child.mjs`, `audit_tipos.mjs`, `test-login.mjs` — untracked,
  scripts de debug one-shot; mover a `_archive/` o borrar.
- `src/app/error.tsx` ya no es debug (cerrado en este turno).

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
