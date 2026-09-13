# TAREA: DEEPSEEK-10 — Unit test de `getIndicadoresFlat()`

```text
TAREA: DEEPSEEK-10
TIER: T1
PRIORIDAD: P3
ESTADO: 🟢 listo

OBJETIVO:
  Cubrir con unit test `getIndicadoresFlat()` (helper nuevo que alimenta el
  versionado de metas), que hoy no tiene test propio.

CONTEXTO:
  `getIndicadoresFlat()` vive en src/lib/repos/metas-convenio.ts y devuelve
  `Record<IndicadorKey, {actual, meta, pct, cumplida}>` derivado de la vista
  `sgs_v_indicador_global`. El archivo tests/unit/metas-convenio.test.ts YA tiene
  un mock de `sql` (helper `dispatch`) y mock de `_cache`. Reutilizalo.

ARCHIVOS (tocar SOLO estos):
  - platform/tests/unit/metas-convenio.test.ts   (agregar un describe)
NO TOCAR:
  - src/ (si el helper tuviera un bug, reportalo a T0).

PASOS:
  1) Agregá `getIndicadoresFlat` al import existente del test.
  2) Agregá un `describe("getIndicadoresFlat")` que:
     - mockee las filas del global (ver `GLOBAL_ROWS` existente),
     - afirme que devuelve los 10 IndicadorKey,
     - afirme `pct` (ej. 6/12 → 50; 40/79 → 51) y
       `cumplida` (true cuando actual >= meta; false si no),
     - cubra `actual` ausente → 0 y `cumplida` false (meta > 0).
  3) Reutilizá el helper `dispatch` que ya está en el archivo.

NO HACER:
  - No toques la migración 36 ni metas-convenio.ts.
  - No metas asserts de valores de negocio reales (usá filas mockeadas).

VALIDACIÓN:
  - cd platform && npx vitest run tests/unit/metas-convenio.test.ts
  - npm run release:gate

CRITERIOS DE ACEPTACIÓN:
  AC-01: hay tests nuevos para `getIndicadoresFlat` (≥3 casos).
  AC-02: `npx vitest run tests/unit/metas-convenio.test.ts` verde.
  AC-03: `npm run release:gate` verde.

ENTREGABLE:
  - Commit `test(platform): DEEPSEEK-10 — unit test de getIndicadoresFlat`
  - Reporte §0.6
```
