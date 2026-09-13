# TAREA: DEEPSEEK-44 — `AGENTS.md`: coordinación + fuente única

```text
TAREA: DEEPSEEK-44
TIER: T1
PRIORIDAD: P3
ESTADO: 🟢 listo

OBJETIVO:
  Que AGENTS.md apunte a la coordinación multiagente y al gate, y agregue la
  regla de fuente única de indicadores.

CONTEXTO:
  AGENTS.md es la guía de agentes. Falta: pointer a docs/DEEPSEEK-COORDINATION.md,
  docs/tasks/QUEUE.md, `npm run release:gate`, y el anti-patrón de duplicar
  patrones de actividad fuera de la migración 36.

ARCHIVOS (tocar SOLO estos):
  - AGENTS.md   (es el de platform/AGENTS.md)
NO TOCAR:
  - código ni otros docs.

PASOS:
  1) En la sección "Antes de empezar", agregá un paso: leer
     `docs/DEEPSEEK-COORDINATION.md` y `docs/tasks/QUEUE.md` (tiers T0/T1,
     plantillas de tarea/reporte).
  2) En "Comandos frecuentes", agregá `npm run release:gate`.
  3) En "Anti-patrones", agregá: "❌ Duplicar patrones de actividad
     (`%cerco vivo%`, `%silvopastoril%`, etc.) fuera de la migración 36 —
     la fuente única es `sgs_v_indicador_*`."
  4) Verificá que las rutas citadas existan.

NO HACER:
  - Cambios quirúrgicos; no reescribas el archivo.

VALIDACIÓN:
  - Verificá que los paths citados existan.

CRITERIOS DE ACEPTACIÓN:
  AC-01: AGENTS.md menciona DEEPSEEK-COORDINATION.md y tasks/QUEUE.md.
  AC-02: menciona `npm run release:gate`.
  AC-03: incluye el anti-patrón de fuente única (migración 36).

ENTREGABLE:
  - Commit `docs(agents): DEEPSEEK-44 — coordinacion + release:gate + fuente unica`
  - Reporte §0.6
```
