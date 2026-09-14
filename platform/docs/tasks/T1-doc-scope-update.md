# TAREA: DEEPSEEK-69 — Actualizar docs de alcance/plan

```text
TAREA: DEEPSEEK-69
TIER: T1
PRIORIDAD: P3
ESTADO: 🟢 listo

OBJETIVO:
  Alinear docs/ALCANCE.md y docs/PLAN-CIERRE-HOY.md con los cambios recientes.

CONTEXTO:
  - `/analisis` ahora redirige a `/mapa` (las herramientas de análisis viven en el visor).
  - El mapa tiene capas "Intervenciones (puntos/áreas)" y panel de datos por capa.
  - El dashboard del home muestra el strip de Metas del convenio.
  - Se quitaron los logos del header.

ARCHIVOS (tocar SOLO estos):
  - platform/docs/ALCANCE.md
  - platform/docs/PLAN-CIERRE-HOY.md
NO TOCAR:
  - código.

PASOS:
  1) En ALCANCE.md §2: quitar `/analisis` como módulo separado y aclarar que el análisis
     está en `/mapa`; mover `/analisis` a §3 (fuera de alcance, redirige).
  2) En ALCANCE.md §4: actualizar "placeholders a eliminar" (ya se quitaron 3D/marcadores);
     mencionar que los logos se eliminaron del header.
  3) En PLAN-CIERRE-HOY.md: nota de que el dashboard incluye el resumen de metas y que
     `/analisis` se fusionó al mapa. Sin reescribir el doc.

NO HACER:
  - No inventes estado; reflejá lo que ya está en el código.

VALIDACIÓN:
  - Verificá que cada ruta citada exista (Test-Path/grep).

CRITERIOS DE ACEPTACIÓN:
  AC-01: ALCANCE.md ya no lista `/analisis` como módulo en alcance.
  AC-02: ambos docs mencionan el análisis dentro de `/mapa` y el panel de datos por capa.

ENTREGABLE:
  - Commit `docs(scope): DEEPSEEK-69 — alinear alcance/plan con mapa y dashboard`
  - Reporte §0.6.
```
