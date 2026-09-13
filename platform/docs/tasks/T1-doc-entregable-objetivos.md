# TAREA: DEEPSEEK-61 — Matriz objetivo → módulo → evidencia

```text
TAREA: DEEPSEEK-61
TIER: T1
PRIORIDAD: P1 (entregable)
ESTADO: 🟢 listo

OBJETIVO:
  Documento que mapea cada objetivo del Convenio 3038-2024 a lo que lo cumple,
  con cómo verificarlo.

CONTEXTO:
  Los objetivos están en docs/PLAN-CIERRE-HOY.md §1. La app ya los cubre; falta
  el documento trazable para el cliente.

ARCHIVOS (tocar SOLO estos):
  - platform/docs/ENTREGABLE-OBJETIVOS.md   (NUEVO)
NO TOCAR:
  - código.

PASOS:
  1) Tabla: Objetivo | Qué lo cumple | Módulo/ruta | Cómo se verifica.
     - OG (SIG para integrar/gestionar) → GDB en PostGIS + app.
     - OE1 (variables) → modelo BDG (37 migraciones) + MODELO-DATOS.md.
     - OE2 (consolidar + GDB) → import GDB a Supabase (conteos reales).
     - OE3 (visor web) → `/mapa`, `/predios`, `/intervenciones`, `/metas/convenio`,
       `/reportes` + herramientas SIG.
  2) Para cada fila, un comando o ruta concreta de verificación
     (ej. `npm run audit:resultados`, `/metas/convenio`).
  3) Referenciá docs existentes (no inventes).

NO HACER:
  - No repitas todo el plan; sé conciso y trazable.

VALIDACIÓN:
  - Verificá que cada ruta/comando citado exista.

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe platform/docs/ENTREGABLE-OBJETIVOS.md.
  AC-02: las 4 filas (OG + 3 OE) con módulo y verificación.
  AC-03: rutas/comandos citados existen.

ENTREGABLE:
  - Commit `docs(deliverable): DEEPSEEK-61 — matriz objetivo -> evidencia`
  - Reporte §0.6
```
