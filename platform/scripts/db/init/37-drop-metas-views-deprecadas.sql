-- =============================================================================
-- 37-drop-metas-views-deprecadas.sql
--
-- Elimina las vistas `sgs_v_metas_resumen`, `sgs_v_metas_resumen_global` y
-- `sgs_v_municipios_intervenidos` (creadas en migraciones 12 y 13).
--
-- Por qué:
--   Eran una SEGUNDA definición de las metas del convenio (con patrones y
--   unidades distintas a las del código). Desde Sprint 23 la fuente única es
--   `sgs_v_indicador_propuesta` / `sgs_v_indicador_global` (migración 36).
--   Sus consumidores (`/metas`, `repos/metas.ts`, `/api/metas`) se removieron.
--
-- Es idempotente (`DROP VIEW IF EXISTS`). Se dropea primero la vista global
-- porque depende de `sgs_v_metas_resumen`.
-- =============================================================================

DROP VIEW IF EXISTS sgs_v_metas_resumen_global;
DROP VIEW IF EXISTS sgs_v_metas_resumen;
DROP VIEW IF EXISTS sgs_v_municipios_intervenidos;
