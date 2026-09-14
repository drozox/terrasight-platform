# PARALLEL BATCH 08 — 4 cards (predios + dashboard)

> **Para MiniMax (T1) en MODO MULTIAGENTE PARALELO.**
> Plan: [`../PLAN-MEJORAS-MAPA-DASHBOARD.md`](../PLAN-MEJORAS-MAPA-DASHBOARD.md).
> **El mapa (F1/F2/F3/F6) lo hace T0** — NO lo toquen (evita conflictos).

## Batch (4 cards, archivos disjuntos)

| # | Card | Archivos |
|---|------|----------|
| 1 | [T1-predio-detail-enrich.md](./T1-predio-detail-enrich.md) (F4) | `app/predios/[id]/*` (+ `predio-mapa.tsx` nuevo) |
| 2 | [T1-dashboard-interactive.md](./T1-dashboard-interactive.md) (F5) | `app/dashboard-suspense.tsx`, `components/dashboard/*` |
| 3 | [T1-integration-predios.md](./T1-integration-predios.md) | `tests/integration/predios.int.test.ts` (nuevo) |
| 4 | [T1-e2e-predio-detalle.md](./T1-e2e-predio-detalle.md) | `tests/e2e/predio-detalle.spec.ts` (nuevo) |

**Conflictos:** disjuntos → seguro en paralelo.

## Reglas (obligatorias)
1. 1 agente por card; rama `t1/<slug>`; commit **solo** de tus archivos.
2. Antes de commitear: `npx tsc --noEmit` (0) y `npm run lint` (0).
3. **NO** `npm run release:gate` ni `npm run build` en paralelo (T0 los corre al integrar).
4. **NO toques** el mapa (`map-client.tsx`, `geojson-layer.tsx`, `map-legend.tsx`, `mapa-mini.tsx`) — los está editando T0 **ahora**.
5. Ambiguo o >5 archivos → BLOCKED + reporte. Importá de `"vitest"` lo que uses.
6. Reporte §0.6 con: `git log --oneline -1` + `npx tsc --noEmit` + test + Test-Path.

## Zona reservada a T0
`map-client.tsx`, `geojson-layer.tsx`, `map-legend.tsx`, `mapa-mini.tsx`, `map-layer-data-panel.tsx`,
`src/app/intervenciones/[id]/*`, `src/lib/repos/metas-convenio.ts`, `src/lib/repos/geojson.ts`,
`src/app/api/geo/*`, `scripts/prod_smoke.mjs`.

---

## PROMPT LISTO PARA PEGAR A MINIMAX

```text
Repo: C:\Users\agFab\OneDrive\Documents\GitHub\TG-Nikoll
MODO MULTIAGENTE PARALELO (4 agentes).

Ejecutá las 4 cards de: platform/docs/tasks/PARALLEL-BATCH-08.md
(1 agente por card; archivos disjuntos).

IMPORTANTE: T0 (DeepSeek) está editando AHORA el módulo de mapa
(map-client.tsx, geojson-layer.tsx, map-legend.tsx, mapa-mini.tsx). NO los toques.

Reglas:
- Rama propia t1/<slug>. Commit SOLO de tus archivos (git add <paths>).
- Antes de commitear: `npx tsc --noEmit` (0 errors) y `npm run lint` (0 errors).
- NO corras `npm run release:gate` ni `npm run build` en paralelo (choca .next).
- No toques archivos fuera de tu card. Ambiguo o >5 archivos → BLOCKED + reporte.
- Importá de "vitest" todo lo que uses.
- Reporte por card (§0.6 de platform/docs/DEEPSEEK-COORDINATION.md) con:
  1) git log --oneline -1  2) npx tsc --noEmit  3) tu test (o "e2e: en CI")  4) Test-Path del entregable.

Al terminar, avisá a T0 para integrar y correr el gate final.
```
