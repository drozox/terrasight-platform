# TAREA: DEEPSEEK-25 — Component test de `WorkflowPanel`

```text
TAREA: DEEPSEEK-25
TIER: T1
PRIORIDAD: P3
ESTADO: 🟢 listo

OBJETIVO:
  Test de componente (Vitest + RTL) del `WorkflowPanel` que muestra las
  transiciones válidas según el rol.

CONTEXTO:
  `src/components/workflow/workflow-panel.tsx` es "use client" y usa
  `getTransiciones` de workflow-types. Props: idPropuesta, estadoActual, rol,
  email, historialInicial. Ya hay tests de componentes en
  tests/components/*.test.tsx (ver estado-dropdown.test.tsx para el patrón de
  mock de `next/navigation`).

ARCHIVOS (tocar SOLO estos):
  - platform/tests/components/workflow-panel.test.tsx   (NUEVO)
NO TOCAR:
  - src/ (reportá bugs a T0).

PASOS:
  1) Mockeá `next/navigation` (`useRouter` → `{ refresh: vi.fn() }`) igual que
     en estado-dropdown.test.tsx.
  2) Test A: render con `estadoActual="BORRADOR"`, `rol="GESTOR"` →
     el botón "Enviar a revisión" está visible.
  3) Test B: render con `estadoActual="EN_REVISION"`, `rol="ADMIN"` →
     "Aprobar" y "Rechazar" visibles.
  4) Test C: `estadoActual="FINALIZADA"` → sin botones de transición.
     (No clickees submit; solo asserts de render.)

NO HACER:
  - No hagas fetch real; no clickees transiciones (eso sería integración).
  - No toques el componente.

VALIDACIÓN:
  - cd platform && npx vitest run tests/components/workflow-panel.test.tsx
  - npx tsc --noEmit

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe tests/components/workflow-panel.test.tsx (≥3 casos).
  AC-02: verde.
  AC-03: sin warnings de act() ni errores de consola.

ENTREGABLE:
  - Commit `test(platform): DEEPSEEK-25 — component test WorkflowPanel`
  - Reporte §0.6
```
