# TAREA: DEEPSEEK-70 — E2E de las capas `/api/geo` nuevas

```text
TAREA: DEEPSEEK-70
TIER: T1
PRIORIDAD: P2
ESTADO: 🟢 listo

OBJETIVO:
  Blindar con E2E que las capas nuevas del mapa responden con FeatureCollection.

CONTEXTO:
  `/api/geo?layer=X` sirve GeoJSON. Se agregaron `propuestas_punto` y `propuestas_poligono`
  (los puntos de C2 ya tienen geometría). Patrón: tests/e2e/api-data.spec.ts (login real).

ARCHIVOS (tocar SOLO este):
  - platform/tests/e2e/geo-layers.spec.ts   (NUEVO)
NO TOCAR:
  - src/.

PASOS:
  1) Reutilizá el login de smoke-routes/api-data.
  2) Con sesión, GET `/api/geo?layer=propuestas_punto` → 200, JSON `type === "FeatureCollection"`
     y `features` es array con longitud > 0.
  3) GET `/api/geo?layer=propuestas_poligono` → 200 + FeatureCollection.
  4) GET `/api/geo?layer=predios` → 200 + FeatureCollection.

NO HACER:
  - No asumas conteos exactos; solo `> 0` en puntos.
  - No testees layer inexistente (ya está cubierto en otro test si aplica).

VALIDACIÓN:
  - cd platform && npx tsc --noEmit
  - (e2e en CI con server + BD) npm run test:e2e

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe tests/e2e/geo-layers.spec.ts.
  AC-02: en CI pasan.

ENTREGABLE:
  - Commit `test(e2e): DEEPSEEK-70 — capas /api/geo (propuestas punto/área)`
  - Reporte §0.6.
```
