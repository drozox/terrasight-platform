# PARALLEL BATCH 01 — 4 cards en paralelo (multi-agente)

> **Para MiniMax (T1) en MODO MULTIAGENTE PARALELO.**
> DeepSeek (T0) coordina, revisa y corre el gate final. Ver
> [`../DEEPSEEK-COORDINATION.md`](../DEEPSEEK-COORDINATION.md) §0.4–0.6.

## Batch (ejecutar las 4 a la vez, una por agente)

| # | Card | Archivos que TOCA (disjuntos) |
|---|------|-------------------------------|
| 1 | [T1-review-guide-refresh.md](./T1-review-guide-refresh.md) | `platform/docs/REVIEW-GUIDE.md` |
| 2 | [T1-metas-flat-unit-test.md](./T1-metas-flat-unit-test.md) | `platform/tests/unit/metas-convenio.test.ts` |
| 3 | [T1-integration-nofallback.md](./T1-integration-nofallback.md) | `platform/tests/integration/repos.int.test.ts` (nuevo) |
| 4 | [T1-e2e-metas-drilldown.md](./T1-e2e-metas-drilldown.md) | `platform/tests/e2e/metas.spec.ts` (nuevo) |

**Mapa de conflictos:** los 4 conjuntos de archivos son **disjuntos** → seguro en paralelo.

## Reglas de ejecución paralela (obligatorias)

1. **1 agente por card.** No tomar dos.
2. **Rama propia por agente:** `t1/<slug>` (o `git worktree`). No trabajar los 4 sobre `main`
   al mismo tiempo.
3. **Commit solo de tus archivos:** `git add <tus paths>` (nunca `git add -A`).
4. **PROHIBIDO `npm run release:gate` en paralelo** (build/tests comparten `.next` y CPU → choques).
   Durante el trabajo: `npx tsc --noEmit` + **tu** test puntual. El **T0** corre el gate
   completo al integrar.
5. **No tocar** archivos fuera de tu card. Si necesitás algo de otro, queda **BLOCKED**.
6. **Reportar** al terminar con la plantilla §0.6 (TAREA, ESTADO, COMMIT, VALIDACIÓN,
   ACEPTACIÓN, BLOQUEOS, SIGUIENTE).

## Zona reservada a T0 (NO tocar)
`scripts/db/init/36-*`, `src/lib/repos/metas-convenio.ts`, `.github/workflows/ci.yml`,
`scripts/ci-migrate.sh`, `src/lib/auth.ts`, `src/lib/auth-guard.ts`.

---

## Directiva lista para pegar a MiniMax

```text
Estás en MODO MULTIAGENTE PARALELO.

Leé y ejecutá las 4 cards de: platform/docs/tasks/PARALLEL-BATCH-01.md
(1 agente por card; los archivos de cada card son disjuntos).

Reglas:
- Cada agente en su rama t1/<slug>. Commit con `git add` SOLO de sus archivos.
- NO corras `npm run release:gate` en paralelo (choca el build). Usá
  `npx tsc --noEmit` + tu test puntual durante el trabajo.
- NO toques archivos fuera de tu card. Si algo es ambiguo → BLOCKED y avisá.
- Al terminar cada card, reportá con la plantilla §0.6 de
  platform/docs/DEEPSEEK-COORDINATION.md (TAREA/ESTADO/COMMIT/VALIDACIÓN/ACEPTACIÓN/BLOQUEOS).

Al terminar las 4, avisá a T0 (DeepSeek) para que integre y corra el gate final.
```
