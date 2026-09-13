# TAREA: DEEPSEEK-16 — `TECH-DEBT.md` al día

```text
TAREA: DEEPSEEK-16
TIER: T1
PRIORIDAD: P3
ESTADO: 🟢 listo

OBJETIVO:
  Refrescar platform/docs/TECH-DEBT.md con lo resuelto y lo abierto en Sprint 23.

CONTEXTO:
  TECH-DEBT.md cierra en DEBT-3.x (2026-07). Desde entonces se resolvieron varios
  items y se agregó deuda nueva. Fuente de verdad del estado: docs/DEEPSEEK-COORDINATION.md.

ARCHIVOS (tocar SOLO estos):
  - platform/docs/TECH-DEBT.md
NO TOCAR:
  - código ni otros docs.

PASOS:
  1) Agregá al final una sección "Sprint 23 / DEEPSEEK (2026-09)" con:
     RESUELTOS (con commit corto):
       - P0-1 estados unificados (`9c36a69`)
       - P0-2 secretos redactados (`c04a6f6`)
       - P3-12 fuente única de indicadores / migración 36 (`9f8c996`)
       - D-DEBT-2 revalidación de sesión (`a63089a`)
       - P2-17 vistas deprecadas eliminadas / migración 37 (`751efac`)
       - Fix SRID mixto en `getIntersectPorBoundingBox` (`e8e5b72`)
     ABIERTOS:
       - D-DEBT-1 catálogo cerrado de actividades (requiere decisión de negocio)
       - D-DEBT-3 migrar `next lint` → ESLint CLI (Next 16)
       - D-DEBT-4 scripts del pipeline GDB no versionados (owner)
  2) No borres el historial existente; solo agregá la sección.

NO HACER:
  - No inventes commits ni items. Usá los hashes/itens de DEEPSEEK-COORDINATION.md.

VALIDACIÓN:
  - Revisar que los hashes citados existan (`git log --oneline | grep <hash>`).

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe la sección Sprint 23 / DEEPSEEK.
  AC-02: lista ≥5 resueltos con commit y ≥3 abiertos.
  AC-03: no rompe el formato markdown.

ENTREGABLE:
  - Commit `docs(debt): DEEPSEEK-16 — TECH-DEBT al dia (Sprint 23)`
  - Reporte §0.6
```
