# TAREA: DEEPSEEK-11 — E2E del dashboard de metas y su drill-down

```text
TAREA: DEEPSEEK-11
TIER: T1
PRIORIDAD: P2
ESTADO: 🟢 listo

OBJETIVO:
  Blindar con E2E la zona que causó el bug P1-3: que /metas/convenio cargue y que
  el drill-down de propuestas NO quede vacío.

CONTEXTO:
  El drill-down se rompía por un filtro de acción mal armado (devolvía 0 filas).
  Ya hay E2E en tests/e2e/smoke-routes.spec.ts que hace login real via NextAuth v5.
  Reutilizá ese patrón de login (no inventes otro).

ARCHIVOS (tocar SOLO estos):
  - platform/tests/e2e/metas.spec.ts   (NUEVO)
NO TOCAR:
  - src/ (si algo falla, reportalo; no lo arregles acá).

PASOS:
  1) Copiá de smoke-routes.spec.ts el helper de login (CSRF + callback/credentials
     + cookies) y el uso del fixture `request`.
  2) Test A: con sesión, GET `/metas/convenio` → 200 y el body contiene "Cercos vivos"
     y "Metas del convenio".
  3) Test B: con sesión, GET `/metas/convenio/propuestas?indicador=cercos_vivos` → 200
     y el body NO contiene "No hay propuestas registradas" (ese texto es la señal del
     bug P1-3).
  4) Usá `failOnStatusCode: false` y aserciones sobre el texto del body.

NO HACER:
  - No toques la migración 36, metas-convenio.ts ni el drill-down.
  - No dependas de valores exactos de datos; solo de presencia/ausencia de textos.

VALIDACIÓN:
  - Requiere dev server + BD (como los demás e2e).
    En CI lo corre el workflow; local: `npm run test:e2e` con server en :3001.
  - npm run lint

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe `tests/e2e/metas.spec.ts` con los 2 tests.
  AC-02: reutiliza el login de smoke-routes (no duplica credenciales hardcodeadas
         más allá de las ya existentes).
  AC-03: en CI (con BD) ambos pasan.

ENTREGABLE:
  - Commit `test(e2e): DEEPSEEK-11 — metas + drill-down`
  - Reporte §0.6
```
