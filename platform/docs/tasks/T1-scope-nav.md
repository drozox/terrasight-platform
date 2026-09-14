# TAREA: DEEPSEEK-62 — Sidebar al alcance estricto

```text
TAREA: DEEPSEEK-62
TIER: T1
PRIORIDAD: P1 (entregable)
ESTADO: 🟢 listo

OBJETIVO:
  Dejar el nav SOLO con los módulos que cumplen los objetivos (docs/ALCANCE.md §2).

CONTEXTO:
  El nav actual aún muestra Quebradas y Monitoreo, que quedaron fuera de alcance
  (docs/ALCANCE.md §3). Ya no tiene Dashboard/Catálogos/Alertas/Admin/Config.

ARCHIVOS (tocar SOLO este):
  - platform/src/components/layout/sidebar.tsx
NO TOCAR:
  - las páginas/rutas (quedan accesibles por URL).

PASOS:
  1) Dejá ALL_ITEMS EXACTAMENTE con este orden y labels:
     - "/"                → "Inicio"             (HomeIcon, roles null)
     - "/mapa"            → "Mapa"               (MapIcon, roles null)
     - "/predios"         → "Predios"            (Building2, roles null)
     - "/intervenciones"  → "Intervenciones"     (Wrench, roles null)
     - "/metas/convenio"  → "Metas del convenio" (Target, roles null)
     - "/analisis"        → "Análisis Espacial"  (PieChart, roles ["ADMIN","ANALISTA"])
     - "/reportes"        → "Reportes"           (FileText, roles ["ADMIN","ANALISTA"])
  2) Quitá Quebradas (`/quebradas`) y Monitoreo (`/monitoreo`).
  3) Quitá los imports de íconos que queden sin uso (`Droplet`, `Activity`).
  4) Dejá un comentario que apunte a `docs/ALCANCE.md`.

NO HACER:
  - No borres rutas ni páginas.
  - No cambies el filtrado por rol.

VALIDACIÓN:
  - cd platform && npx tsc --noEmit && npm run lint
  - npx vitest run tests/components  (si algo referencia el nav)

CRITERIOS DE ACEPTACIÓN:
  AC-01: el nav tiene exactamente 7 items (los de arriba).
  AC-02: tsc 0 errors y lint 0 errors (sin imports muertos).
  AC-03: no queda "/quebradas" ni "/monitoreo" en el sidebar.

ENTREGABLE:
  - Commit `feat(scope): DEEPSEEK-62 — sidebar al alcance del convenio`
  - Reporte §0.6 con `git log --oneline -1` + salida de tsc.
```
