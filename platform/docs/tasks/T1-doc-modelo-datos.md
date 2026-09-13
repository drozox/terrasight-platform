# TAREA: DEEPSEEK-60 — Diccionario de datos (`MODELO-DATOS.md`)

```text
TAREA: DEEPSEEK-60
TIER: T1
PRIORIDAD: P1 (entregable OE1)
ESTADO: 🟢 listo

OBJETIVO:
  Documentar las variables ambientales/territoriales/prediales del modelo BDG
  (objetivo específico 1 del convenio).

CONTEXTO:
  Las variables ya están en las 37 migraciones (`platform/scripts/db/init/`).
  Falta el documento que las lista. Fuente: los CREATE TABLE de las migraciones.

ARCHIVOS (tocar SOLO estos):
  - platform/docs/MODELO-DATOS.md   (NUEVO)
NO TOCAR:
  - código ni migraciones.

PASOS:
  1) Por cada dominio, una sección con tabla(s) → propósito → campos clave:
     - `bcs_lpa_*` (límites político-administrativos: municipio, vereda)
     - `bcs_dh_*` (hidrografía: microcuenca, quebrada)
     - `sgs_pre_*` (predios: predio, propietario, usuario)
     - `sgs_pro_*` (propuestas: super + punto/línea/polígono + avance + estado)
     - `sgs_com_*` (componente, acción)
     - `sgs_amb_*` (cobertura CLC, bioma, páramo, POMCA, RFP)
     - `sgs_inf_*` (vías, drenajes simple/doble)
     - `sgs_ind_*` / `sgs_rel_*` (indicadores y relaciones espaciales)
     - `sgs_amb_monitoreo_punto` (estaciones/obras)
  2) Usá los nombres REALES de tabla/columna (grep en `scripts/db/init/*.sql`).
     NO inventes columnas.
  3) Encabezado con: fuente (GDB del convenio), SRID (4686), y que la fuente
     única de indicadores es `sgs_v_indicador_*` (migración 36).

NO HACER:
  - No listes todas las columnas: solo las clave (id, FK, geometría, medida).
  - No toques SQL.

VALIDACIÓN:
  - Verificá que cada tabla citada exista: `git grep "CREATE TABLE" scripts/db/init`.
  - Sin secretos.

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe platform/docs/MODELO-DATOS.md con los 9 dominios.
  AC-02: cada tabla citada existe en las migraciones.
  AC-03: documenta SRID 4686 y la fuente única de indicadores.

ENTREGABLE:
  - Commit `docs(data): DEEPSEEK-60 — diccionario de datos (OE1)`
  - Reporte §0.6
```
