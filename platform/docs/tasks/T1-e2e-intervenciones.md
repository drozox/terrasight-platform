# TAREA: DEEPSEEK-40 — E2E de `/intervenciones` (list + detalle)

```text
TAREA: DEEPSEEK-40
TIER: T1
PRIORIDAD: P2
ESTADO: 🟢 listo

OBJETIVO:
  E2E que blinda el módulo de intervenciones (lista + ficha con WorkflowPanel).

CONTEXTO:
  Sprint 20 agregó el workflow al detalle. Queremos un e2e que confirme que
  ambas rutas renderizan con sesión sin 500. Patrón de login:
  tests/e2e/smoke-routes.spec.ts.

ARCHIVOS (tocar SOLO estos):
  - platform/tests/e2e/intervenciones.spec.ts   (NUEVO)
NO TOCAR:
  - src/ ni otros specs.

PASOS:
  1) Reutilizá el helper de login de smoke-routes.spec.ts.
  2) Test A: GET `/intervenciones` con sesión → 200 y el body contiene
     "Intervenciones".
  3) Test B: GET `/intervenciones/1` con sesión → status en [200, 404] (NO 500)
     y body SIN patrón de error de Next (`"digest":\s*"\d+"`). Si es 200,
     contiene "Estado" o "Workflow".
  4) Usá `failOnStatusCode: false`.

NO HACER:
  - No escribas transiciones (no POST). Solo lectura.
  - No asumas que el id 1 siempre existe (por eso [200,404]).

VALIDACIÓN:
  - cd platform && npx tsc --noEmit
  - (e2e en CI) npm run test:e2e

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe tests/e2e/intervenciones.spec.ts.
  AC-02: ninguna ruta devuelve 500.
  AC-03: en CI pasan.

ENTREGABLE:
  - Commit `test(e2e): DEEPSEEK-40 — intervenciones list + detalle`
  - Reporte §0.6
```
