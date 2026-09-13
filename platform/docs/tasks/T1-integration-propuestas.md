# TAREA: DEEPSEEK-41 — Integración de `propuestas` (read)

```text
TAREA: DEEPSEEK-41
TIER: T1
PRIORIDAD: P2
ESTADO: 🟢 listo

OBJETIVO:
  Tests de integración (Postgres real) de la lectura de propuestas/intervenciones.

CONTEXTO:
  `getIntervencionCompleta(id)` (src/lib/repos/propuestas.ts) NO usa withFallback
  (debe fallar duro). `listPropuestasSimple(limit)` es lectura simple. Patrón:
  tests/integration/reportes.int.test.ts.

ARCHIVOS (tocar SOLO estos):
  - platform/tests/integration/propuestas.int.test.ts   (NUEVO)
NO TOCAR:
  - src/ (reportá bugs a T0).

PASOS:
  1) Copiá el header (node env, skip sin DATABASE_URL, afterAll cierra pool).
  2) Obtené un id real: `SELECT id_propuesta FROM sgs_pro_propuesta LIMIT 1`.
     Si no hay filas → `it.skip`.
  3) Assert:
     - `getIntervencionCompleta(id)` → objeto con `id`, `tipo`, `estado`,
       y `avances` array.
     - id inexistente (999999999) → null.
     - `listPropuestasSimple(5)` → array de ≤5 con claves idPropuesta/tipo/actividad.

NO HACER:
  - No crees ni modifiques propuestas.
  - No asumas valores exactos de datos.

VALIDACIÓN:
  - cd platform && npx tsc --noEmit
  - npm test (local: se salta sin DATABASE_URL)

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe tests/integration/propuestas.int.test.ts (≥3 tests).
  AC-02: se salta sin DATABASE_URL.
  AC-03: tests verdes.

ENTREGABLE:
  - Commit `test(platform): DEEPSEEK-41 — integracion propuestas`
  - Reporte §0.6
```
