# TAREA: DEEPSEEK-9 — Integración de repos que NO tragan errores

```text
TAREA: DEEPSEEK-9
TIER: T1
PRIORIDAD: P2
ESTADO: 🟢 listo

OBJETIVO:
  Agregar tests de integración (Postgres real) para funciones de repo que NO usan
  `withFallback`, de modo que un SQL roto falle en CI (los unit tests mockean sql).

CONTEXTO:
  Patrón ya existente: tests/integration/reportes.int.test.ts (usa
  `// @vitest-environment node`, `describe.skip` si no hay DATABASE_URL, y cierra
  el pool en `afterAll`). Muchos repos usan `withFallback`, que traga errores de SQL
  — esos NO sirven para este test. Elegí funciones que lancen.

ARCHIVOS (tocar SOLO estos):
  - platform/tests/integration/repos.int.test.ts  (NUEVO)
NO TOCAR:
  - Cualquier src/ (si encontrás un bug, reportalo a T0; no lo arregles acá).

PASOS:
  1) Creá `tests/integration/repos.int.test.ts` copiando el encabezado/estructura de
     `reportes.int.test.ts`.
  2) Por cada función: primero verificá que NO use `withFallback` (grep en
     src/lib/repos). Si lo usa, SALTALA y anotalo en el reporte.
     Candidatas (todas `export async function`):
       - `searchAll("gua")`              src/lib/repos/search.ts
       - `pingDb()`                       src/lib/repos/analisis.ts
       - `getQualityReport()`             src/lib/repos/calidad.ts
       - `getIntersectPorBoundingBox({minLon:-74.1,minLat:4.6,maxLon:-73.7,maxLat:5.5})`
       - `getAnalisisBuffer({ target:"quebrada", id, distanciaM:500 })`
         (obtené un `id` real con `SELECT id_quebrada FROM bcs_dh_quebrada LIMIT 1`;
          si no hay filas, `it.skip`)
  3) Cada test: `await fn(...)` y assert de forma mínima (array / objeto con las
     claves esperadas). No inventes valores exactos de datos.

NO HACER:
  - No cambies src/. No toques la migración 36 ni metas-convenio.ts.
  - No uses `withFallback`-wrappers. No metas asserts de valores de negocio.

VALIDACIÓN:
  - cd platform && npm test        # local: los int se saltan sin DATABASE_URL
  - Con DATABASE_URL: DATABASE_URL=... npm test   (o dejar que CI lo corra)
  - npm run release:gate

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe `tests/integration/repos.int.test.ts` con los candidatos sin fallback.
  AC-02: se salta sin DATABASE_URL (no rompe `npm test` local).
  AC-03: `npm run release:gate` verde.

ENTREGABLE:
  - Commit `test(platform): DEEPSEEK-9 — integracion de repos sin withFallback`
  - Reporte §0.6 (incluí qué funciones saltaste y por qué)
```
