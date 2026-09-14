# TAREA: DEEPSEEK-67 — Component test de `MapLayerDataPanel`

```text
TAREA: DEEPSEEK-67
TIER: T1
PRIORIDAD: P3
ESTADO: 🟢 listo

OBJETIVO:
  Cubrir con test de componente el panel que muestra los datos de una capa.

CONTEXTO:
  `src/components/map/map-layer-data-panel.tsx` fetcha `/api/geo?layer=X` y lista los
  atributos en una tabla. Props: `{ layer: string | null; onClose: () => void }`.
  Patrón: tests/components/*.test.tsx (mock de `fetch` con `vi.stubGlobal`).

ARCHIVOS (tocar SOLO este):
  - platform/tests/components/map-layer-data-panel.test.tsx   (NUEVO)
NO TOCAR:
  - src/.

PASOS:
  1) `layer=null` → no renderiza nada.
  2) Mock `fetch` para devolver un FeatureCollection con 1 feature y `layer="propuestas_punto"`
     → renderiza el título y la fila con la actividad.
  3) Mock `fetch` que responde 500 → muestra "Error".
  4) Verificá que se llama a `/api/geo?layer=propuestas_punto`.

NO HACER:
  - No testees Leaflet ni el mapa. Solo el panel.

VALIDACIÓN:
  - cd platform && npx vitest run tests/components/map-layer-data-panel.test.tsx
  - npx tsc --noEmit

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe el test con ≥3 casos.
  AC-02: verde; tsc 0 errors (importá de "vitest" lo que uses).

ENTREGABLE:
  - Commit `test(platform): DEEPSEEK-67 — component test MapLayerDataPanel`
  - Reporte §0.6 con `git log --oneline -1` + vitest.
```
