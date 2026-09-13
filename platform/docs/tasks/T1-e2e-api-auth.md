# TAREA: DEEPSEEK-24 — E2E de guardas de auth en API

```text
TAREA: DEEPSEEK-24
TIER: T1
PRIORIDAD: P2
ESTADO: 🟢 listo

OBJETIVO:
  E2E que verifica que los endpoints privados devuelven 401 sin sesión y que
  `/api/health` es público.

CONTEXTO:
  El middleware protege todo salvo /login, /api/auth y /api/health. Queremos un
  test explícito de eso (regresión de seguridad). Patrón: tests/e2e/health.spec.ts
  y smoke-routes.spec.ts (fixture `request`, `failOnStatusCode: false`).

ARCHIVOS (tocar SOLO estos):
  - platform/tests/e2e/api-auth.spec.ts   (NUEVO)
NO TOCAR:
  - src/ ni otros specs.

PASOS:
  1) Sin sesión (contexto limpio, SIN login):
     - GET /api/reportes            → 401
     - GET /api/search?q=gua        → 401
     - GET /api/geo?layer=municipios→ 401
     - GET /api/health              → 200
  2) Usá `failOnStatusCode: false` y assert sobre `.status()`.
  3) No loguees en este spec (es justamente "sin sesión").

NO HACER:
  - No testees escrituras (POST) ni mutaciones.
  - No asumas cuerpos exactos; solo status.

VALIDACIÓN:
  - cd platform && npx tsc --noEmit
  - (e2e corre en CI con server + BD) `npm run test:e2e`

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe tests/e2e/api-auth.spec.ts.
  AC-02: los 3 privados dan 401 y /api/health da 200.
  AC-03: en CI pasan.

ENTREGABLE:
  - Commit `test(e2e): DEEPSEEK-24 — guardas de auth en API`
  - Reporte §0.6
```
