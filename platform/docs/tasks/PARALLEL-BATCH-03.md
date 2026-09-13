# PARALLEL BATCH 03 — 5 cards en paralelo (multi-agente)

> **Para MiniMax (T1) en MODO MULTIAGENTE PARALELO.**
> DeepSeek (T0) coordina, revisa y corre el gate final. Ver
> [`../DEEPSEEK-COORDINATION.md`](../DEEPSEEK-COORDINATION.md) §0.4–0.6.
> Lotes previos: [`PARALLEL-BATCH-01.md`](./PARALLEL-BATCH-01.md),
> [`PARALLEL-BATCH-02.md`](./PARALLEL-BATCH-02.md) (cerrados).

## Batch (ejecutar las 5 a la vez, una por agente)

| # | Card | Archivos que TOCA (disjuntos) |
|---|------|-------------------------------|
| 1 | [T1-component-sortable-badge.md](./T1-component-sortable-badge.md) | `tests/components/sortable-header.test.tsx`, `tests/components/badge.test.tsx` (nuevos) |
| 2 | [T1-integration-propuestas.md](./T1-integration-propuestas.md) | `tests/integration/propuestas.int.test.ts` (nuevo) |
| 3 | [T1-e2e-intervenciones.md](./T1-e2e-intervenciones.md) | `tests/e2e/intervenciones.spec.ts` (nuevo) |
| 4 | [T1-doc-runbook.md](./T1-doc-runbook.md) | `platform/docs/RUNBOOK.md` (nuevo) |
| 5 | [T1-doc-agents-coordination.md](./T1-doc-agents-coordination.md) | `AGENTS.md` |

**Mapa de conflictos:** los 5 conjuntos son **disjuntos** → seguro en paralelo.

## Reglas de ejecución paralela (obligatorias)

1. **1 agente por card.** No tomar dos.
2. **Rama propia por agente:** `t1/<slug>`. No trabajar las 5 sobre `main` a la vez.
3. **Commit solo de tus archivos:** `git add <tus paths>` (nunca `git add -A`).
4. **Una card = un commit = un reporte** con §0.6.
5. **Gate:** durante el trabajo corré solo `npx tsc --noEmit` + **tu** test puntual.
   **NO corras `npm run release:gate` ni `npm run build` en paralelo** (comparten `.next`/CPU).
   El gate completo lo corre **T0** al integrar.
6. **No tocar** archivos fuera de tu card. Ambiguo o >5 archivos → **BLOCKED** + reporte.
7. **Verificá `npx tsc --noEmit` antes de commitear** (el lote 02 falló el typecheck por un
   `afterEach` sin importar; importá lo que uses de `vitest`).

## Zona reservada a T0 (NO tocar)
`scripts/db/init/3[6-7]-*`, `src/lib/repos/metas-convenio.ts`, `src/lib/repos/analisis.ts`,
`.github/workflows/ci.yml`, `scripts/ci-migrate.sh`, `src/lib/auth.ts`, `src/lib/auth-guard.ts`.

---

## PROMPT LISTO PARA PEGAR A MINIMAX

```text
Estás en MODO MULTIAGENTE PARALELO con 5 agentes.

Leé y ejecutá las 5 cards de: platform/docs/tasks/PARALLEL-BATCH-03.md
(1 agente por card; los archivos de cada card son disjuntos).

Reglas obligatorias:
- Cada agente trabaja en su rama t1/<slug>. Commit SOLO con `git add` de sus
  archivos (nunca `git add -A`).
- Antes de commitear, corré `npx tsc --noEmit` (0 errors) y tu test puntual.
- NO corras `npm run release:gate` ni `npm run build` en paralelo: comparten
  `.next` y CPU. El gate completo lo corre T0 (DeepSeek) al integrar.
- NO toques archivos fuera de tu card. Ambiguo o >5 archivos → BLOCKED + reporte.
- Importá de "vitest" todo lo que uses (describe/it/expect/vi/beforeEach/afterEach).
- Una card = un commit = un reporte con la plantilla §0.6 de
  platform/docs/DEEPSEEK-COORDINATION.md
  (TAREA / ESTADO / COMMIT / VALIDACIÓN / ACEPTACIÓN / BLOQUEOS / SIGUIENTE).

Al terminar las 5, avisá a T0 para que integre, corra el gate final y actualice
QUEUE.md + DEEPSEEK-COORDINATION.md.
```
