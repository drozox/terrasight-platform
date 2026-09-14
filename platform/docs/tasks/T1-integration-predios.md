# TAREA: DEEPSEEK-73 — Integración de `predios` (Fase 6)

```text
TAREA: DEEPSEEK-73
TIER: T1
PRIORIDAD: P3
ESTADO: 🟢 listo

OBJETIVO:
  Test de integración (Postgres real) de la lectura de un predio y su análisis Fase 6.

ARCHIVOS (tocar SOLO este):
  - platform/tests/integration/predios.int.test.ts   (NUEVO)
NO TOCAR:
  - src/.

PASOS:
  1) Patrón: tests/integration/reportes.int.test.ts (@vitest-environment node,
     describe.skip sin DATABASE_URL, afterAll cierra el pool).
  2) Tomá un id_predio real (`SELECT id_predio FROM sgs_pre_predio LIMIT 1`).
  3) Assert:
     - `getPredioById(id)` → objeto con nombrePredio, areaHa; id inexistente → null.
     - `getPredioAnalisisCompleto(id)` → objeto con claves {indicador, ambiental,
       hidrico, intervencion, coberturas, biomas, paramos, pomcas, rfps}; los
       arrays son arrays.

NO HACER:
  - No asumas valores exactos; solo shapes.

VALIDACIÓN:
  - cd platform && npx tsc --noEmit
  - npm test  (local se salta sin DATABASE_URL)

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe el test con ≥3 casos.
  AC-02: se salta sin DATABASE_URL; verde en CI.

ENTREGABLE:
  - Commit `test(platform): DEEPSEEK-73 — integracion predios/analisis`
  - Reporte §0.6.
```
