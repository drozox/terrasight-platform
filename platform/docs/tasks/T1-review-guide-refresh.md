# TAREA: DEEPSEEK-8 — Refrescar `REVIEW-GUIDE.md`

```text
TAREA: DEEPSEEK-8
TIER: T1
PRIORIDAD: P3
ESTADO: 🟢 listo

OBJETIVO:
  Alinear el checklist de revisión con el estado actual: integration tests, release
  gate y fuente única de indicadores.

CONTEXTO:
  `platform/docs/REVIEW-GUIDE.md` es el checklist para reviewers. Hoy no menciona
  `npm run release:gate` ni `tests/integration`, ni la regla de la fuente única
  (migración 36). El detalle de coordinación está en DEEPSEEK-COORDINATION.md.

ARCHIVOS (tocar SOLO estos):
  - platform/docs/REVIEW-GUIDE.md
NO TOCAR:
  - Ninguno de código. Solo documentación.

PASOS:
  1) §1 "Pre-checks": agregá `npm run release:gate` como comando recomendado y
     aclarar que `npm test` incluye `tests/integration` (se saltan sin DATABASE_URL,
     corren en CI con PostGIS).
  2) §2 Anti-patrones: agregá la fila "duplicar patrones de actividad fuera de la
     migración 36" (la fuente única es `sgs_v_indicador_*`).
  3) §9 Recursos: sumá `docs/DEEPSEEK-COORDINATION.md`, `docs/tasks/QUEUE.md` y
     `tests/integration/`.
  4) Verificá que los links/rutas que citás existan (no inventes archivos).

NO HACER:
  - No reescribas el documento entero; cambios quirúrgicos.
  - No borres secciones existentes.

VALIDACIÓN:
  - Revisar que cada path citado exista (Test-Path / grep).
  - (No aplica release:gate por ser solo docs, pero corré `npm run lint` por higiene.)

CRITERIOS DE ACEPTACIÓN:
  AC-01: §1 menciona `npm run release:gate` y `tests/integration`.
  AC-02: §2 incluye la regla de fuente única (migración 36).
  AC-03: §9 linkea DEEPSEEK-COORDINATION.md y tasks/QUEUE.md.
  AC-04: no hay links rotos.

ENTREGABLE:
  - Commit `docs(review): DEEPSEEK-8 — integration + release gate + fuente unica`
  - Reporte §0.6
```
