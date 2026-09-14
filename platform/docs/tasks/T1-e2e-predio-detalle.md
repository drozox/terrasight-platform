# TAREA: DEEPSEEK-74 — E2E de la ficha de predio

```text
TAREA: DEEPSEEK-74
TIER: T1
PRIORIDAD: P2
ESTADO: 🟢 listo

OBJETIVO:
  E2E que blinda /predios/[id] (no debe dar 500 y debe mostrar la ficha).

ARCHIVOS (tocar SOLO este):
  - platform/tests/e2e/predio-detalle.spec.ts   (NUEVO)
NO TOCAR:
  - predios/[id]/* (lo hace DEEPSEEK-71; vos solo testeás).

PASOS:
  1) Reutilizá el login de smoke-routes.spec.ts.
  2) Con sesión, GET `/predios` → 200 y el body contiene "Predios".
  3) GET `/predios/1` → status en [200, 404] (NO 500) y body SIN `"digest":\s*"\d+"`.
     Si es 200, contiene "Cédula" o "Propietario".

NO HACER:
  - No asumas que el id 1 existe (por eso [200,404]).

VALIDACIÓN:
  - cd platform && npx tsc --noEmit
  - (e2e en CI) npm run test:e2e

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe el spec.
  AC-02: en CI pasan.

ENTREGABLE:
  - Commit `test(e2e): DEEPSEEK-74 — ficha de predio`
  - Reporte §0.6.
```
