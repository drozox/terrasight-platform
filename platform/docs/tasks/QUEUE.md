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

> **Lote paralelo activo:** [`PARALLEL-BATCH-01.md`](./PARALLEL-BATCH-01.md) (4 cards disjuntas).

| Card | Tier | Prioridad | Estado | Archivo |
|------|------|-----------|--------|---------|
| `P3-11.b` CSV: quotear si el valor tiene coma | T1 | P3 | ✅ done (`83cb0cb`) | [T1-csv-comma-quoting.md](./T1-csv-comma-quoting.md) |
| `DEEPSEEK-8` Refrescar `REVIEW-GUIDE.md` | T1 | P3 | ✅ done (`8f00694`) | [T1-review-guide-refresh.md](./T1-review-guide-refresh.md) |
| `DEEPSEEK-10` Unit test de `getIndicadoresFlat()` | T1 | P3 | ✅ done (`063b006`) | [T1-metas-flat-unit-test.md](./T1-metas-flat-unit-test.md) |
| `DEEPSEEK-9` Integración de repos sin `withFallback` | T1 | P2 | ✅ done (`d5f2eff`) → bug SRID arreglado por T0 (`<este commit>`) | [T1-integration-nofallback.md](./T1-integration-nofallback.md) |
| `DEEPSEEK-11` E2E de `/metas/convenio` + drill-down | T1 | P2 | ✅ done (`c74102e`) | [T1-e2e-metas-drilldown.md](./T1-e2e-metas-drilldown.md) |

**Lote 01 cerrado.** DEEPSEEK-9 detectó un bug real (SRID mixto en `getIntersectPorBoundingBox`) y T0 lo arregló.

## Reservado a T0 (no delegar)
- `scripts/db/init/36-indicadores-fuente-unica.sql`, `src/lib/repos/metas-convenio.ts`
- `.github/workflows/ci.yml`, `scripts/ci-migrate.sh`
- Validación de la migración 36 en CI/real (`P2-VAL`)
- Diseño del catálogo de actividades (`D-DEBT-1`) — requiere decisión del owner

## Owner (no código)
- Rotar password de Supabase (`P0-2`) y correr `npm run release:gate` con `DATABASE_URL`.
