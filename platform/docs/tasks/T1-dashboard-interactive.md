# TAREA: DEEPSEEK-72 (F5) — Dashboard interactivo

```text
TAREA: DEEPSEEK-72
TIER: T1
PRIORIDAD: P2
ESTADO: 🟢 listo

OBJETIVO:
  Hacer el home más interactivo: KPIs clickeables (drill-through) y secciones
  con acceso directo a las vistas filtradas.

CONTEXTO:
  `src/app/page.tsx` + `src/app/dashboard-suspense.tsx` + componentes/dashboard/*.
  El strip `metas-strip.tsx` ya linkea a /metas/convenio.

ARCHIVOS (tocar SOLO estos):
  - platform/src/app/dashboard-suspense.tsx
  - platform/src/components/dashboard/right-panel.tsx
  - platform/src/components/dashboard/bottom-sections.tsx
  - platform/src/components/dashboard/component-ribbon.tsx
NO TOCAR:
  - mapa, predios, metas-convenio.

PASOS:
  1) Que cada KPI (predios, propuestas/intervenciones, municipios, metas) sea
     un Link a su vista: /predios, /intervenciones, /metas/convenio.
  2) Las tarjetas de componentes (C1/C2/C3) del ribbon/right-panel deben linkear
     a /intervenciones?componente=C1|C2|C3 (el filtro ya existe en la página).
  3) Agregá hover/focus states claros (cursor pointer, ring focus-visible) sin
     romper el layout.

NO HACER:
  - No cambies las queries ni el mapa del home.

VALIDACIÓN:
  - cd platform && npx tsc --noEmit && npm run lint
  - npx vitest run tests/components

CRITERIOS DE ACEPTACIÓN:
  AC-01: los KPIs son <Link> y navegan a su vista.
  AC-02: los componentes linkean con `?componente=Cx`.
  AC-03: tsc 0 errors, lint 0 errors.

ENTREGABLE:
  - Commit `feat(dashboard): DEEPSEEK-72 — dashboard interactivo (drill-through)`
  - Reporte §0.6.
```
