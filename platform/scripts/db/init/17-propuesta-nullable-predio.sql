-- =============================================================================
-- Permitir NULL en id_predio de sgs_pro_propuesta (Phase 2)
--
-- La GDB del convenio no asigna id_predio a los 692 puntos de propuesta_punto.
-- El super-tipo sgs_pro_propuesta requiere id_predio para asociar la propuesta
-- a un predio, pero para los puntos no hay FK.
--
-- Rollback manual:
--   ALTER TABLE sgs_pro_propuesta ALTER COLUMN id_predio SET NOT NULL;
-- =============================================================================

ALTER TABLE sgs_pro_propuesta ALTER COLUMN id_predio DROP NOT NULL;
