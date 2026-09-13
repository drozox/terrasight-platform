# TAREA: DEEPSEEK-54 — E2E de endpoints de datos (CSV + snapshots)

```text
TAREA: DEEPSEEK-54
TIER: T1
PRIORIDAD: P2
ESTADO: 🟢 listo

OBJETIVO:
  E2E con sesión de dos endpoints de datos: descarga CSV de reportes y lista de
  snapshots de metas.

CONTEXTO:
  `/api/reportes?tipo=R1` (GET, ADMIN/ANALISTA) devuelve CSV. `/api/metas/snapshots`
  (GET) devuelve `{ snapshots: [...] }`. Patrón de login: smoke-routes.spec.ts.

ARCHIVOS (tocar SOLO estos):
  - platform/tests/e2e/api-data.spec.ts   (NUEVO)
NO TOCAR:
  - src/ ni otros specs.

PASOS:
  1) Reutilizá el helper de login de smoke-routes.spec.ts.
  2) Test A: GET `/api/reportes?tipo=R1` con sesión → 200, header
     `content-type` contiene `text/csv`, y el body (texto) incluye `;` (separador).
  3) Test B: GET `/api/metas/snapshots` con sesión → 200 y JSON con clave
     `snapshots` (array, puede estar vacío).
  4) `failOnStatusCode: false` + asserts manuales.

NO HACER:
  - No POSTees (no crees snapshots).
  - No asumas filas exactas.

VALIDACIÓN:
  - cd platform && npx tsc --noEmit
  - (e2e en CI) npm run test:e2e

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe tests/e2e/api-data.spec.ts con los 2 tests.
  AC-02: en CI (con BD + server) pasan.
  AC-03: tsc 0 errors.

ENTREGABLE:
  - Commit `test(e2e): DEEPSEEK-54 — endpoints de datos (reportes CSV + metas snapshots)`
  - Reporte §0.6
```
