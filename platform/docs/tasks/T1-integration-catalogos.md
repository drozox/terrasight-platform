# TAREA: DEEPSEEK-12 — Integración de `catalogos` (read)

```text
TAREA: DEEPSEEK-12
TIER: T1
PRIORIDAD: P3
ESTADO: 🟢 listo

OBJETIVO:
  Tests de integración (Postgres real) para los getters de catálogos.

CONTEXTO:
  Patrón: tests/integration/reportes.int.test.ts. `getComponenteById` y
  `getAccionById` (src/lib/repos/catalogos.ts) son `export async function`
  (sin withFallback). Verificá el grep antes de testear; si alguno usa
  withFallback, saltalo y anotalo.

ARCHIVOS (tocar SOLO estos):
  - platform/tests/integration/catalogos.int.test.ts   (NUEVO)
NO TOCAR:
  - src/ (reportá bugs a T0, no los arregles).

PASOS:
  1) Copiá el header/estructura de reportes.int.test.ts (@vitest-environment node,
     describe.skip sin DATABASE_URL, afterAll cierra el pool).
  2) Obtené ids reales:
     `SELECT id_componente FROM sgs_com_componente LIMIT 1`
     `SELECT id_accion FROM sgs_com_accion LIMIT 1`
     Si no hay filas → `it.skip`.
  3) Assert: `getComponenteById(id)` devuelve objeto con `nombre`; id inexistente
     (ej. 999999) → null. Ídem `getAccionById`.

NO HACER:
  - No crear/editar/borrar catálogos (eso muta datos). Solo READ.
  - No asumir valores exactos de datos.

VALIDACIÓN:
  - cd platform && npx tsc --noEmit
  - npm test   (local: se saltan sin DATABASE_URL)

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe tests/integration/catalogos.int.test.ts.
  AC-02: se salta sin DATABASE_URL.
  AC-03: tests verdes.

ENTREGABLE:
  - Commit `test(platform): DEEPSEEK-12 — integracion catalogos read`
  - Reporte §0.6
```
