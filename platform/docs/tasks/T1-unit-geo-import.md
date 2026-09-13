# TAREA: DEEPSEEK-13 — Unit tests de `geo-import` (puro)

```text
TAREA: DEEPSEEK-13
TIER: T1
PRIORIDAD: P3
ESTADO: 🟢 listo

OBJETIVO:
  Caracterizar con unit tests las funciones puras de src/lib/geo-import.ts.

CONTEXTO:
  `geo-import.ts` parsea/valida GeoJSON y formatea métricas de importación.
  No tenía tests. Funciones puras: `parseGeoJSON`, `formatAreaHa`,
  `formatLongitudM`, `formatBbox`, `buildResumenImportacion`.

ARCHIVOS (tocar SOLO estos):
  - platform/tests/unit/geo-import.test.ts   (NUEVO)
NO TOCAR:
  - src/ (si encontrás un bug, reportalo a T0).

PASOS:
  1) LEÉ src/lib/geo-import.ts para conocer el comportamiento exacto (son
     characterization tests: reflejan lo que la función HACE hoy).
  2) Cubrí:
     - `parseGeoJSON` con un FeatureCollection válido (devuelve features) y con
       texto inválido (debe lanzar).
     - `formatAreaHa` / `formatLongitudM` / `formatBbox` con números normales y
       con `undefined`/null/0 (documentá el comportamiento real).
     - `buildResumenImportacion` con un FC de 1 feature (claves del resumen).
  3) Si una función delega en DOM/File (ej. `parseShapefile`), NO la testees acá.

NO HACER:
  - No inventes comportamiento: si algo no está claro, assert mínimo (no-throw +
    tipo) y anotalo en el reporte.
  - No toques archivos fuera de la card.

VALIDACIÓN:
  - cd platform && npx vitest run tests/unit/geo-import.test.ts
  - npx tsc --noEmit

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe tests/unit/geo-import.test.ts con ≥6 casos.
  AC-02: `npx vitest run tests/unit/geo-import.test.ts` verde.
  AC-03: `npx tsc --noEmit` 0 errors.

ENTREGABLE:
  - Commit `test(platform): DEEPSEEK-13 — unit tests geo-import`
  - Reporte §0.6
```
