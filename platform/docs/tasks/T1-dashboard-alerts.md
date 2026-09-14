# TAREA: DEEPSEEK-66 — Dashboard: quitar la sección de Alertas (fuera de alcance)

```text
TAREA: DEEPSEEK-66
TIER: T1
PRIORIDAD: P2
ESTADO: 🟢 listo

OBJETIVO:
  El dashboard no debe mostrar Alertas (módulo fuera de alcance según docs/ALCANCE.md).
  Dejar el right panel enfocado en KPIs + componentes + tendencia.

CONTEXTO:
  `src/app/dashboard-suspense.tsx` (RightPanelSection) hace `getAlertas(5)` y se lo pasa
  a `src/components/dashboard/right-panel.tsx`, que renderiza una sección de alertas.

ARCHIVOS (tocar SOLO estos):
  - platform/src/components/dashboard/right-panel.tsx
  - platform/src/app/dashboard-suspense.tsx
NO TOCAR:
  - la ruta `/alertas` ni sus repos (queda accesible por URL).

PASOS:
  1) En `right-panel.tsx`: quitá la prop `alertas` (y su tipo) y la sección que la renderiza
     (grep `alerta`). Quitá imports/íconos que queden sin uso.
  2) En `dashboard-suspense.tsx`: quitá `getAlertas` del import y del `Promise.all` de
     `RightPanelSection`; quitá la prop `alertas` del `<RightPanel>`.

NO HACER:
  - No borres el repo `getAlertas` ni la página `/alertas`.
  - No cambies KPIs ni gráficos.

VALIDACIÓN:
  - cd platform && npx tsc --noEmit && npm run lint
  - npx vitest run tests/components

CRITERIOS DE ACEPTACIÓN:
  AC-01: `git grep -n "alertas" platform/src/components/dashboard platform/src/app/dashboard-suspense.tsx` no muestra la sección.
  AC-02: tsc 0 errors y lint 0 errors.
  AC-03: el dashboard compila (build no requerido; lo corre T0).

ENTREGABLE:
  - Commit `refactor(dashboard): DEEPSEEK-66 — quitar alertas (fuera de alcance)`
  - Reporte §0.6 con `git log --oneline -1` + tsc + vitest.
```
