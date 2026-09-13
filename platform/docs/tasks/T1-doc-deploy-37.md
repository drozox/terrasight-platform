# TAREA: DEEPSEEK-15 — `DEPLOY.md` a 37 migraciones

```text
TAREA: DEEPSEEK-15
TIER: T1
PRIORIDAD: P3
ESTADO: 🟢 listo

OBJETIVO:
  Alinear DEPLOY.md con el esquema actual: son 37 migraciones (no 25), y la
  verificación usa la fuente única `sgs_v_indicador_*`.

CONTEXTO:
  DEPLOY.md tiene varios conteos stale ("25 migraciones", tabla de 01..25) y una
  query de verificación de vistas viejas. Es doc-only.

ARCHIVOS (tocar SOLO estos):
  - DEPLOY.md
NO TOCAR:
  - platform/scripts/ ni código.

PASOS:
  1) `grep -n "migraciones\|25\b" DEPLOY.md` y reemplazá los conteos por 37
     (sin inventar: la cuenta es `ls platform/scripts/db/init/*.sql | wc -l`).
  2) Extendé la tabla de migraciones hasta 37 usando el COMENTARIO DE CABECERA de
     cada archivo `platform/scripts/db/init/NN-*.sql` (no inventes descripciones).
     Si 26..37 no aportan filas nuevas, agregá una nota "ver `db/init/`".
  3) Asegurate de que la sección §1.5 use las vistas `sgs_v_indicador_*`
     (la de vistas viejas ya se corrigió; verificá que no quede texto duplicado).
  4) `git grep -n "sgs_v_metas\|25 migraciones" DEPLOY.md` debe dar vacío.

NO HACER:
  - No reescribas todo el doc; cambios quirúrgicos.
  - No toques otros .md.

VALIDACIÓN:
  - Revisar que no queden conteos incorrectos.
  - (no aplica release:gate por ser solo docs)

CRITERIOS DE ACEPTACIÓN:
  AC-01: no queda ninguna referencia a "25 migraciones".
  AC-02: la tabla/lista cubre hasta 37 (o remite a `db/init/`).
  AC-03: `git grep sgs_v_metas DEPLOY.md` vacío.

ENTREGABLE:
  - Commit `docs(deploy): DEEPSEEK-15 — DEPLOY a 37 migraciones + fuente unica`
  - Reporte §0.6
```
