# TAREA: DEEPSEEK-63 — Eliminar placeholders 3D y Marcadores

```text
TAREA: DEEPSEEK-63
TIER: T1
PRIORIDAD: P1 (entregable)
ESTADO: 🟢 listo

OBJETIVO:
  Quitar del visor los botones de "próxima fase" (3D y Marcadores), que no
  corresponden al entregable (docs/ALCANCE.md §4).

CONTEXTO:
  map-search-bar.tsx renderiza un botón "3D · pronto" (View3DDialog) y un botón
  de Marcadores (BookmarksDialog), ambos placeholders "Próxima fase".

ARCHIVOS:
  - platform/src/components/map/map-search-bar.tsx   (editar)
  - platform/src/components/map/view-3d-dialog.tsx   (BORRAR)
  - platform/src/components/map/bookmarks-dialog.tsx  (BORRAR)
  - platform/tests/components/view-3d-dialog.test.tsx (BORRAR)
  - platform/tests/components/bookmarks-dialog.test.tsx (BORRAR)
NO TOCAR:
  - el resto del visor.

PASOS:
  1) En map-search-bar.tsx quitá: imports de View3DDialog/BookmarksDialog,
     los estados view3DOpen/bookmarksOpen, los dos botones, y los dos usos de
     los diálogos. Quitá de `lucide-react` los íconos que queden sin uso
     (`Bookmark`, `Box`).
  2) Borrá los 2 componentes y sus 2 tests.
  3) Verificá que nadie más los importe (grep) antes de borrar.

NO HACER:
  - No toques otras herramientas del mapa (medir/identificar/buffer/bbox).

VALIDACIÓN:
  - cd platform && npx tsc --noEmit && npm run lint
  - npx vitest run tests/components
  - git grep -n "View3DDialog\|BookmarksDialog" src tests  → sin resultados

CRITERIOS DE ACEPTACIÓN:
  AC-01: no quedan referencias a View3DDialog/BookmarksDialog.
  AC-02: tsc 0 errors, lint 0 errors, tests de components verdes.
  AC-03: el search bar del mapa queda solo con búsqueda.

ENTREGABLE:
  - Commit `feat(scope): DEEPSEEK-63 — quitar placeholders 3D y marcadores`
  - Reporte §0.6 con `git log --oneline -1` + tsc + vitest.
```
