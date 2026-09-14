# PARALLEL BATCH 06 — Acotamiento de módulos/funcionalidades

> **Para MiniMax (T1) en MODO MULTIAGENTE PARALELO.**
> Objetivo: dejar la app **solo con lo que cumplen los objetivos** del Convenio
> 3038-2024. Guía de alcance: [`../ALCANCE.md`](../ALCANCE.md).
> Ver también [`../PLAN-CIERRE-HOY.md`](../PLAN-CIERRE-HOY.md).

## Batch (4 cards, archivos disjuntos)

| # | Card | Archivos |
|---|------|----------|
| 1 | [T1-scope-nav.md](./T1-scope-nav.md) | `src/components/layout/sidebar.tsx` |
| 2 | [T1-scope-placeholders.md](./T1-scope-placeholders.md) | `src/components/map/map-search-bar.tsx` + borra 2 dialogs y 2 tests |
| 3 | [T1-doc-modelo-datos.md](./T1-doc-modelo-datos.md) | `platform/docs/MODELO-DATOS.md` (nuevo) |
| 4 | [T1-doc-entregable-objetivos.md](./T1-doc-entregable-objetivos.md) | `platform/docs/ENTREGABLE-OBJETIVOS.md` (nuevo) |

**Conflictos:** disjuntos → seguro en paralelo.

## Reglas (obligatorias)
1. 1 agente por card; rama `t1/<slug>`; commit **solo** de tus archivos (`git add <paths>`).
2. Antes de commitear: `npx tsc --noEmit` (0 errors) y `npm run lint` (0 errors).
3. **NO** corras `npm run release:gate` ni `npm run build` en paralelo.
4. No toques archivos fuera de tu card.
5. Reporte §0.6 **con**: `git log --oneline -1` + tsc + (tests si aplica) + `Test-Path` del entregable.

## Zona reservada a T0
`scripts/db/init/*`, `src/lib/repos/metas-convenio.ts`, `src/lib/repos/analisis.ts`,
`.github/workflows/ci.yml`, `scripts/ci-migrate.sh*`, `src/lib/auth*.ts`, `scripts/prod_smoke.mjs`.

---

## PROMPT LISTO PARA PEGAR A MINIMAX

```text
Repo: C:\Users\agFab\OneDrive\Documents\GitHub\TG-Nikoll
MODO MULTIAGENTE PARALELO (4 agentes).

Ejecutá las 4 cards de: platform/docs/tasks/PARALLEL-BATCH-06.md
(1 agente por card; archivos disjuntos).

Contexto: estamos ACOTANDO la app a lo que cumplen los objetivos del convenio.
Guía: platform/docs/ALCANCE.md (léela).

Reglas:
- Rama propia t1/<slug>. Commit SOLO de tus archivos (git add <paths>).
- Antes de commitear: `npx tsc --noEmit` (0) y `npm run lint` (0).
- NO corras `npm run release:gate` ni `npm run build` en paralelo.
- No toques archivos fuera de tu card. Ambiguo → BLOCKED + reporte.
- Reporte §0.6 con: git log --oneline -1 + tsc + (tests) + Test-Path del entregable.

Al terminar, avisá a T0 para integrar y correr el gate.
```
