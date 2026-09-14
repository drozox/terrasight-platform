# PARALLEL BATCH 07 — 5 cards (cierre del acotamiento + cobertura)

> **Para MiniMax (T1) en MODO MULTIAGENTE PARALELO.**
> Contexto: acabamos de acotar la app a los objetivos, reparar la geometría de los
> puntos de C2, agregar capas de intervenciones + panel de datos, y quitar logos/analisis.
> Ver [`../ALCANCE.md`](../ALCANCE.md) y [`../DEEPSEEK-COORDINATION.md`](../DEEPSEEK-COORDINATION.md).

## Batch (5 cards, archivos disjuntos)

| # | Card | Archivos |
|---|------|----------|
| 1 | [T1-dashboard-alerts.md](./T1-dashboard-alerts.md) | `components/dashboard/right-panel.tsx`, `app/dashboard-suspense.tsx` |
| 2 | [T1-test-layer-data-panel.md](./T1-test-layer-data-panel.md) | `tests/components/map-layer-data-panel.test.tsx` (nuevo) |
| 3 | [T1-clean-analisis.md](./T1-clean-analisis.md) | borra `src/app/analisis/*` (menos `page.tsx`) |
| 4 | [T1-doc-scope-update.md](./T1-doc-scope-update.md) | `docs/ALCANCE.md`, `docs/PLAN-CIERRE-HOY.md` |
| 5 | [T1-e2e-geo-layers.md](./T1-e2e-geo-layers.md) | `tests/e2e/geo-layers.spec.ts` (nuevo) |

**Conflictos:** disjuntos → seguro en paralelo.

## Reglas (obligatorias)
1. 1 agente por card; rama `t1/<slug>`; commit **solo** de tus archivos.
2. Antes de commitear: `npx tsc --noEmit` (0) y `npm run lint` (0).
3. **NO** `npm run release:gate` ni `npm run build` en paralelo (T0 lo corre al integrar).
4. No toques archivos fuera de tu card. Ambiguo → BLOCKED + reporte.
5. Importá de `"vitest"` lo que uses. Reporte §0.6 con: `git log --oneline -1` + tsc + (tests) + Test-Path.

## Zona reservada a T0
`scripts/db/init/*`, `src/lib/repos/metas-convenio.ts`, `src/lib/repos/analisis.ts`,
`src/lib/repos/geojson.ts`, `src/app/api/geo/route.ts`, `scripts/prod_smoke.mjs`, `src/lib/auth*.ts`.

---

## PROMPT LISTO PARA PEGAR A MINIMAX

```text
Repo: C:\Users\agFab\OneDrive\Documents\GitHub\TG-Nikoll
MODO MULTIAGENTE PARALELO (5 agentes).

Ejecutá las 5 cards de: platform/docs/tasks/PARALLEL-BATCH-07.md
(1 agente por card; archivos disjuntos).

Reglas:
- Rama propia t1/<slug>. Commit SOLO de tus archivos (git add <paths>).
- Antes de commitear: `npx tsc --noEmit` (0 errors) y `npm run lint` (0 errors).
- NO corras `npm run release:gate` ni `npm run build` en paralelo (choca .next).
- No toques archivos fuera de tu card. Ambiguo o >5 archivos → BLOCKED + reporte.
- Importá de "vitest" todo lo que uses.
- Reporte por card (§0.6 de platform/docs/DEEPSEEK-COORDINATION.md) con:
  1) git log --oneline -1  2) npx tsc --noEmit  3) tu test (o "e2e: en CI")  4) Test-Path del entregable.

Al terminar, avisá a T0 (DeepSeek) para integrar y correr el gate final.
```
