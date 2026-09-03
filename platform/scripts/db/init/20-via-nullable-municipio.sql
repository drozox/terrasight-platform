-- =============================================================================
-- Permitir NULL en id_municipio de sgs_inf_via (Phase 2)
--
-- 70% de las vias del GDB no caen en los 20 municipios de Cundinamarca.
-- Mantener id_municipio NOT NULL bloquearía la importación.
--
-- Rollback manual:
--   ALTER TABLE sgs_inf_via ALTER COLUMN id_municipio SET NOT NULL;
-- =============================================================================

ALTER TABLE sgs_inf_via ALTER COLUMN id_municipio DROP NOT NULL;
