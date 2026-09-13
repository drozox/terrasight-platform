# PARALLEL BATCH 04 — 6 cards en paralelo (multi-agente)

> **Para MiniMax (T1) en MODO MULTIAGENTE PARALELO.**
> ⚠️ **El lote 03 NO se entregó** (sin archivos, commits ni ramas). Estas 5 cards
> se **re-emiten** y se agrega 1 nueva. Leé el protocolo de autoverificación abajo.
> Ver [`../DEEPSEEK-COORDINATION.md`](../DEEPSEEK-COORDINATION.md) §0.4–0.6.

## Batch (ejecutar las 6 a la vez, una por agente)

| # | Card | Archivos que TOCA (disjuntos) | Estado |
|---|------|-------------------------------|--------|
| 1 | [T1-component-sortable-badge.md](./T1-component-sortable-badge.md) | `tests/components/sortable-header.test.tsx`, `tests/components/badge.test.tsx` | 🔁 re-emitida |
| 2 | [T1-integration-propuestas.md](./T1-integration-propuestas.md) | `tests/integration/propuestas.int.test.ts` | 🔁 re-emitida |
| 3 | [T1-e2e-intervenciones.md](./T1-e2e-intervenciones.md) | `tests/e2e/intervenciones.spec.ts` | 🔁 re-emitida |
| 4 | [T1-doc-runbook.md](./T1-doc-runbook.md) | `platform/docs/RUNBOOK.md` | 🔁 re-emitida |
| 5 | [T1-doc-agents-coordination.md](./T1-doc-agents-coordination.md) | `AGENTS.md` | 🔁 re-emitida |
| 6 | [T1-e2e-api-data.md](./T1-e2e-api-data.md) | `tests/e2e/api-data.spec.ts` | 🆕 nueva |

**Mapa de conflictos:** los 6 conjuntos son **disjuntos** → seguro en paralelo.

## Protocolo de autoverificación (OBLIGATORIO — el lote 03 falló acá)

Antes de declarar una card DONE, el agente debe **probar** que el entregable existe:

1. `git status --short` → tus archivos aparecen como `??` o `M`.
2. `git add <tus paths> && git commit -m "..."` → el commit existe (`git log --oneline -1`).
3. `npx tsc --noEmit` → 0 errors.
4. Pegar en el reporte:
   - `git log --oneline -1`
   - la salida de `npx tsc --noEmit`
   - para tests: el resultado de `npx vitest run <tu archivo>`

Un reporte sin esos 4 puntos = **rechazado**.

## Reglas de ejecución paralela

1. **1 agente por card.** Rama propia `t1/<slug>`.
2. Commit **solo de tus archivos** (`git add <paths>`), nunca `git add -A`.
3. **NO `npm run release:gate` ni `npm run build` en paralelo** (comparten `.next`).
4. Ambiguo o >5 archivos → **BLOCKED** + reporte.
5. Importá de `"vitest"` todo lo que uses.

## Zona reservada a T0 (NO tocar)
`scripts/db/init/3[6-7]-*`, `src/lib/repos/metas-convenio.ts`, `src/lib/repos/analisis.ts`,
`.github/workflows/ci.yml`, `scripts/ci-migrate.sh`, `src/lib/auth.ts`, `src/lib/auth-guard.ts`.

---

## PROMPT LISTO PARA PEGAR A MINIMAX

```text
Estás en MODO MULTIAGENTE PARALELO con 6 agentes.

Leé y ejecutá las 6 cards de: platform/docs/tasks/PARALLEL-BATCH-04.md
(1 agente por card; los archivos de cada card son disjuntos).

IMPORTANTE: el intento anterior (lote 03) NO dejó evidencia (sin archivos,
sin commits, sin ramas). Antes de decir "DONE", PROBÁ que el entregable existe.

Reglas obligatorias:
- Cada agente trabaja en su rama t1/<slug>. Commit SOLO con `git add` de sus
  archivos (nunca `git add -A`).
- Antes de commitear: `npx tsc --noEmit` (0 errors) y tu test puntual.
- NO corras `npm run release:gate` ni `npm run build` en paralelo (comparten
  `.next` y CPU). El gate completo lo corre T0 al integrar.
- NO toques archivos fuera de tu card. Ambiguo o >5 archivos → BLOCKED + reporte.
- Importá de "vitest" todo lo que uses.

Reporte por card (§0.6 de platform/docs/DEEPSEEK-COORDINATION.md) INCLUYENDO:
  1) `git log --oneline -1`
  2) salida de `npx tsc --noEmit`
  3) resultado de `npx vitest run <tu archivo>` (o "e2e: en CI")
Sin esos 3 puntos, T0 rechaza el reporte.

Al terminar las 6, avisá a T0 para integrar y correr el gate final.
```
