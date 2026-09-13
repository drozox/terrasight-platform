# TAREA: DEEPSEEK-35 — Component tests de `SortableHeader` y `Badge`

```text
TAREA: DEEPSEEK-35
TIER: T1
PRIORIDAD: P3
ESTADO: 🟢 listo

OBJETIVO:
  Cubrir los primitivos UI `SortableHeader` y `Badge` con tests de render.

CONTEXTO:
  src/components/ui/sortable-header.tsx y src/components/ui/badge.tsx no tienen
  tests. Son componentes sin hooks (render server-safe). Patrón: tests/components/empty-state.test.tsx.

ARCHIVOS (tocar SOLO estos):
  - platform/tests/components/sortable-header.test.tsx   (NUEVO)
  - platform/tests/components/badge.test.tsx             (NUEVO)
NO TOCAR:
  - src/ (reportá bugs a T0).

PASOS:
  1) SortableHeader:
     - render con field="nombre", currentSort="nombre", currentOrder="asc",
       basePath="/predios", children "Nombre" → el <a> href contiene
       `sort=nombre` y `order=desc` (toggle) y `aria-sort="ascending"`.
     - render con currentSort="otro" → href con `order=asc` y `aria-sort="none"`.
     - con searchParams {vereda:"V1"} → el href preserva `vereda=V1`.
  2) Badge:
     - variant="success" → el span tiene la clase `text-success`.
     - sin variant (default) → clase `text-primary`.
     - pasa `className` extra y se aplica.

NO HACER:
  - No testees navegación real; solo el href/aria/clases.
  - No toques los componentes.

VALIDACIÓN:
  - cd platform && npx vitest run tests/components/sortable-header.test.tsx tests/components/badge.test.tsx
  - npx tsc --noEmit

CRITERIOS DE ACEPTACIÓN:
  AC-01: ambos archivos existen con ≥2 casos cada uno.
  AC-02: verde.
  AC-03: tsc 0 errors (importá `afterEach` de "vitest" si lo usás).

ENTREGABLE:
  - Commit `test(platform): DEEPSEEK-35 — component tests SortableHeader + Badge`
  - Reporte §0.6
```
