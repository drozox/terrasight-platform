# TAREA: DEEPSEEK-68 — Eliminar componentes muertos de `/analisis`

```text
TAREA: DEEPSEEK-68
TIER: T1
PRIORIDAD: P3
ESTADO: 🟢 listo

OBJETIVO:
  `/analisis` ahora redirige a `/mapa`; sus sub-componentes quedaron sin uso. Eliminarlos.

CONTEXTO:
  `src/app/analisis/page.tsx` es un redirect. Quedaron archivos huérfanos en esa carpeta.

ARCHIVOS (BORRAR, SOLO dentro de platform/src/app/analisis/):
  - buffer-form.tsx, buffer-results.tsx
  - intersection-bbox-form.tsx, intersection-results.tsx
  - cobertura-section.tsx, cobertura-municipio-section.tsx
  - matriz-table.tsx, _types.ts
  (NO borrar `page.tsx`)
NO TOCAR:
  - `page.tsx` (el redirect), ni nada fuera de esa carpeta.

PASOS:
  1) Antes de borrar, `git grep -n "<NombreComponente>"` para confirmar que nadie los importa
     desde fuera de `/analisis`. Si alguno se usa afuera → NO lo borres, anotalo.
  2) Borrá los archivos confirmados huérfanos.

NO HACER:
  - No borres el redirect ni repos.

VALIDACIÓN:
  - cd platform && npx tsc --noEmit && npm run lint && npx vitest run

CRITERIOS DE ACEPTACIÓN:
  AC-01: no quedan imports a los componentes borrados.
  AC-02: tsc 0 errors, lint 0 errors, tests verdes.

ENTREGABLE:
  - Commit `chore(cleanup): DEEPSEEK-68 — eliminar componentes muertos de /analisis`
  - Reporte §0.6 (listá qué borraste y qué dejaste).
```
