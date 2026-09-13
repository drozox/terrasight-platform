# PARALLEL BATCH 02 — 6 cards en paralelo (multi-agente)

> **Para MiniMax (T1) en MODO MULTIAGENTE PARALELO.**
> DeepSeek (T0) coordina, revisa y corre el gate final. Ver
> [`../DEEPSEEK-COORDINATION.md`](../DEEPSEEK-COORDINATION.md) §0.4–0.6.
> Lote previo: [`PARALLEL-BATCH-01.md`](./PARALLEL-BATCH-01.md) (cerrado).

## Batch (ejecutar las 6 a la vez, una por agente)

| # | Card | Archivos que TOCA (disjuntos) |
|---|------|-------------------------------|
| 1 | [T1-integration-catalogos.md](./T1-integration-catalogos.md) | `tests/integration/catalogos.int.test.ts` (nuevo) |
| 2 | [T1-unit-geo-import.md](./T1-unit-geo-import.md) | `tests/unit/geo-import.test.ts` (nuevo) |
| 3 | [T1-component-workflow-panel.md](./T1-component-workflow-panel.md) | `tests/components/workflow-panel.test.tsx` (nuevo) |
| 4 | [T1-e2e-api-auth.md](./T1-e2e-api-auth.md) | `tests/e2e/api-auth.spec.ts` (nuevo) |
| 5 | [T1-doc-deploy-37.md](./T1-doc-deploy-37.md) | `DEPLOY.md` |
| 6 | [T1-doc-tech-debt.md](./T1-doc-tech-debt.md) | `platform/docs/TECH-DEBT.md` |

**Mapa de conflictos:** los 6 conjuntos son **disjuntos** → seguro en paralelo.

## Reglas de ejecución paralela (obligatorias)

1. **1 agente por card.** No tomar dos.
2. **Rama propia por agente:** `t1/<slug>` (o `git worktree`). No trabajar los 6 sobre `main` a la vez.
3. **Commit solo de tus archivos:** `git add <tus paths>` (nunca `git add -A`).
4. **Una card = un commit = un reporte** con §0.6.
5. **Gate:** durante el trabajo corré solo `npx tsc --noEmit` + **tu** test puntual.
   **NO corras `npm run release:gate` ni `npm run build` en paralelo** (comparten `.next`/CPU → choques).
   El gate completo lo corre **T0** al integrar.
6. **No tocar** archivos fuera de tu card. Ambiguo o >5 archivos → **BLOCKED** + reporte.
7. Si sos el único agente activo y querés correr el gate completo, avisá a T0 antes.

## Zona reservada a T0 (NO tocar)
`scripts/db/init/3[6-7]-*`, `src/lib/repos/metas-convenio.ts`, `src/lib/repos/analisis.ts`,
`.github/workflows/ci.yml`, `scripts/ci-migrate.sh`, `src/lib/auth.ts`, `src/lib/auth-guard.ts`.

---

## PROMPT LISTO PARA PEGAR A MINIMAX

```text
Estás en MODO MULTIAGENTE PARALELO con 6 agentes.

Leé y ejecutá las 6 cards de: platform/docs/tasks/PARALLEL-BATCH-02.md
(1 agente por card; los archivos de cada card son disjuntos).

Reglas obligatorias:
- Cada agente trabaja en su rama t1/<slug>. Commit SOLO con `git add` de sus
  archivos (nunca `git add -A`).
- NO corras `npm run release:gate` ni `npm run build` en paralelo: comparten
  `.next` y CPU. Durante el trabajo usá `npx tsc --noEmit` + tu test puntual.
  El gate completo lo corre T0 (DeepSeek) al integrar.
- NO toques archivos fuera de tu card. Si algo es ambiguo o crece a >5 archivos,
  marcá BLOCKED y reportá.
- Una card = un commit = un reporte con la plantilla §0.6 de
  platform/docs/DEEPSEEK-COORDINATION.md
  (TAREA / ESTADO / COMMIT / VALIDACIÓN / ACEPTACIÓN / BLOQUEOS / SIGUIENTE).

Al terminar las 6, avisá a T0 para que integre, corra el gate final y actualice
QUEUE.md + DEEPSEEK-COORDINATION.md.
```
