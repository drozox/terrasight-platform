# TASK QUEUE — TerraSight (coordinación DeepSeek)

> Tablero de tareas para agentes **T1 (MiniMax M3 / workers)**.
> DeepSeek (T0) escribe las cards y revisa; los T1 ejecutan **una card a la vez**.
> Reglas: ver [`../DEEPSEEK-COORDINATION.md`](../DEEPSEEK-COORDINATION.md) §0.4–0.6.

## Cómo se usa
1. El worker abre una card `🟢` de la tabla.
2. La ejecuta **completa y solo esa** (no toca archivos fuera de `ARCHIVOS`).
3. Corre `npm run release:gate` y reporta con la plantilla §0.6.
4. Actualiza el estado acá y avisa a T0 para revisión.

## Tablero

> **Lote 08 (cerrado)**: F5 (dashboard) + tests predios; **F4 (ficha predio) la hizo MiniMax** y T0 la integró.
> Plan mejoras: [`../PLAN-MEJORAS-MAPA-DASHBOARD.md`](../PLAN-MEJORAS-MAPA-DASHBOARD.md) ·
> Separación: [`../SEPARACION-COMPLEJOS.md`](../SEPARACION-COMPLEJOS.md).
> **T0 (DeepSeek)**: F1 `b89b260`, F3 `ba50bba`. Pendiente T0: C1/C5/C4/C2.
> Lotes cerrados: 01, 02, 04, 06, 07, 08 (03 no entregado → 04; 05 absorbido por 06).

| Card | Tier | Prioridad | Estado | Archivo |
|------|------|-----------|--------|---------|
| `P3-11.b` CSV: quotear si el valor tiene coma | T1 | P3 | ✅ done (`83cb0cb`) | [T1-csv-comma-quoting.md](./T1-csv-comma-quoting.md) |
| `DEEPSEEK-8` Refrescar `REVIEW-GUIDE.md` | T1 | P3 | ✅ done (`8f00694`) | [T1-review-guide-refresh.md](./T1-review-guide-refresh.md) |
| `DEEPSEEK-10` Unit test de `getIndicadoresFlat()` | T1 | P3 | ✅ done (`063b006`) | [T1-metas-flat-unit-test.md](./T1-metas-flat-unit-test.md) |
| `DEEPSEEK-9` Integración de repos sin `withFallback` | T1 | P2 | ✅ done (`d5f2eff`) → bug SRID arreglado por T0 (`<este commit>`) | [T1-integration-nofallback.md](./T1-integration-nofallback.md) |
| `DEEPSEEK-11` E2E de `/metas/convenio` + drill-down | T1 | P2 | ✅ done (`c74102e`) | [T1-e2e-metas-drilldown.md](./T1-e2e-metas-drilldown.md) |

**Lote 01 cerrado.** DEEPSEEK-9 detectó un bug real (SRID mixto en `getIntersectPorBoundingBox`) y T0 lo arregló.

## Lote 02 (cerrado)

| Card | Tier | Prioridad | Estado | Archivo |
|------|------|-----------|--------|---------|
| `DEEPSEEK-12` Integración catálogos (read) | T1 | P3 | ✅ done (`631d781`) | [T1-integration-catalogos.md](./T1-integration-catalogos.md) |
| `DEEPSEEK-13` Unit tests `geo-import` | T1 | P3 | ✅ done (`d475589`) | [T1-unit-geo-import.md](./T1-unit-geo-import.md) |
| `DEEPSEEK-25` Component test `WorkflowPanel` | T1 | P3 | ✅ done (`1672ecd`) → fix `afterEach` por T0 | [T1-component-workflow-panel.md](./T1-component-workflow-panel.md) |
| `DEEPSEEK-24` E2E guardas de auth en API | T1 | P2 | ✅ done (`b8435ed`) → `BASE` sin uso por T0 | [T1-e2e-api-auth.md](./T1-e2e-api-auth.md) |
| `DEEPSEEK-15` `DEPLOY.md` a 37 migraciones | T1 | P3 | ✅ done (`44867c7`) → 2 nombres de tabla corregidos por T0 | [T1-doc-deploy-37.md](./T1-doc-deploy-37.md) |
| `DEEPSEEK-16` `TECH-DEBT.md` al día | T1 | P3 | ✅ done (`7fb4c92`) | [T1-doc-tech-debt.md](./T1-doc-tech-debt.md) |

**Lote 02 cerrado** (merge octopus `8cfd731`). DEEPSEEK-24 descubrió que el middleware **redirige (302)** en vez de devolver 401; T0 aceptó y documentó.

## Lote 03 (⚠️ no entregado)

> Sin evidencia en el repo: ni archivos, ni commits, ni ramas `t1/*`, ni stash.
> Verificado 2026-09-13 (git log/reflog/fsck/branch). Re-emitido en el lote 04.

| Card | Tier | Prioridad | Estado | Archivo |
|------|------|-----------|--------|---------|
| `DEEPSEEK-35` Component tests `SortableHeader` + `Badge` | T1 | P3 | ⚠️ no entregado | [T1-component-sortable-badge.md](./T1-component-sortable-badge.md) |
| `DEEPSEEK-41` Integración `propuestas` (read) | T1 | P2 | ⚠️ no entregado | [T1-integration-propuestas.md](./T1-integration-propuestas.md) |
| `DEEPSEEK-40` E2E `/intervenciones` (list + detalle) | T1 | P2 | ⚠️ no entregado | [T1-e2e-intervenciones.md](./T1-e2e-intervenciones.md) |
| `DEEPSEEK-29` `RUNBOOK` de operación | T1 | P2 | ⚠️ no entregado | [T1-doc-runbook.md](./T1-doc-runbook.md) |
| `DEEPSEEK-44` `AGENTS.md`: coordinación + fuente única | T1 | P3 | ⚠️ no entregado | [T1-doc-agents-coordination.md](./T1-doc-agents-coordination.md) |

## Lote 07 (cerrado) — cierre de acotamiento + cobertura

> Merge octopus de 5 ramas `t1/*`. Gate con BD: `GOAL_COMPLETED = TRUE`.

| Card | Tier | Prioridad | Estado | Commit |
|------|------|-----------|--------|--------|
| `DEEPSEEK-66` Dashboard: quitar alertas (fuera de alcance) | T1 | P2 | ✅ done | `28ffd5d` |
| `DEEPSEEK-67` Component test `MapLayerDataPanel` | T1 | P3 | ✅ done | `7fbdb7c` |
| `DEEPSEEK-68` Eliminar componentes muertos de `/analisis` | T1 | P3 | ✅ done | `ec542d5` |
| `DEEPSEEK-69` Actualizar docs alcance/plan | T1 | P3 | ✅ done | `1349f5b` |
| `DEEPSEEK-70` E2E capas `/api/geo` (puntos/áreas) | T1 | P2 | ✅ done | `eda8ba5` |

## Lote 06 (cerrado) — acotamiento + entregables

> Ejecutado por **T0 (DeepSeek)** a pedido del owner. Guía: [`../ALCANCE.md`](../ALCANCE.md).

| Card | Tier | Prioridad | Estado | Archivo |
|------|------|-----------|--------|---------|
| `DEEPSEEK-62` Sidebar al alcance estricto | T0 | P1 | ✅ done | [T1-scope-nav.md](./T1-scope-nav.md) |
| `DEEPSEEK-63` Quitar placeholders 3D/marcadores | T0 | P1 | ✅ done | [T1-scope-placeholders.md](./T1-scope-placeholders.md) |
| `DEEPSEEK-60` Diccionario de datos (OE1) | T0 | P1 | ✅ done | [T1-doc-modelo-datos.md](./T1-doc-modelo-datos.md) |
| `DEEPSEEK-61` Matriz objetivo → evidencia | T0 | P1 | ✅ done | [T1-doc-entregable-objetivos.md](./T1-doc-entregable-objetivos.md) |

## Lote 04 (cerrado 2026-09-13)

> 6 branches `t1/*` mergeadas a `main` (octopus implícito de 6 merges
> `--no-ff`). Validación pre-commit por cada agente: `npx tsc --noEmit` 0
> errors; `npx vitest run <archivo>` verde (o skip sin DATABASE_URL).

| Card | Tier | Prioridad | Estado | Commit + Merge |
|------|------|-----------|--------|----------------|
| `DEEPSEEK-35` Component tests `SortableHeader` + `Badge` | T1 | P3 | ✅ done | `a0ea651` → merge `86a5bf5` |
| `DEEPSEEK-41` Integración `propuestas` (read) | T1 | P2 | ✅ done | `9c78a7d` → merge `bc95a0a` |
| `DEEPSEEK-40` E2E `/intervenciones` (list + detalle) | T1 | P2 | ✅ done | `df67b6d` → merge `0549355` |
| `DEEPSEEK-29` `RUNBOOK` de operación | T1 | P2 | ✅ done | `9aece48` → merge `0407496` |
| `DEEPSEEK-44` `AGENTS.md`: coordinación + fuente única | T1 | P3 | ✅ done | `1067283` → merge `1553d85` |
| `DEEPSEEK-54` E2E endpoints de datos (CSV + snapshots) | T1 | P2 | ✅ done | `812f6ea` → merge `9224066` |

**Lote 04 cerrado** (HEAD `9224066`). Tests verdes: 13 (DEEPSEEK-35) + 4
skip-sin-DB (DEEPSEEK-41) + 2 e2e CI (DEEPSEEK-40) + 2 e2e CI (DEEPSEEK-54).


## Reservado a T0 (no delegar)
- `scripts/db/init/36-indicadores-fuente-unica.sql`, `src/lib/repos/metas-convenio.ts`
- `.github/workflows/ci.yml`, `scripts/ci-migrate.sh`
- Validación de la migración 36 en CI/real (`P2-VAL`)
- Diseño del catálogo de actividades (`D-DEBT-1`) — requiere decisión del owner

## Owner (no código)
- Rotar password de Supabase (`P0-2`) y correr `npm run release:gate` con `DATABASE_URL`.
