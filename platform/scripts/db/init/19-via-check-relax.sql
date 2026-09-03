-- =============================================================================
-- Relajar CHECK constraints de sgs_inf_via (Phase 2)
--
-- El GDB del convenio tiene vias con:
--   - tipo_via: INTEGER (1-9, no solo 3 valores)
--   - estado_superficie: "Sin Valor" u otros strings fuera del CHECK
--   - numero_car: 0 en muchas vias (PG tiene DEFAULT 1)
--
-- Relajamos los CHECK para aceptar datos reales. Defaults se aplican a NULLs.
-- =============================================================================

ALTER TABLE sgs_inf_via DROP CONSTRAINT IF EXISTS sgs_inf_via_tipo_via_check;
ALTER TABLE sgs_inf_via DROP CONSTRAINT IF EXISTS sgs_inf_via_estado_superficie_check;
