-- =============================================================================
-- Permitir NULL en id_quebrada para propuesta GDB (Phase 2)
--
-- El GDB del convenio NO tiene capa `bcs_dh_quebrada`. Sin embargo, el
-- schema de plataforma define `id_quebrada INTEGER NOT NULL` en:
--   - sgs_pro_propuesta (FK al super-tipo)
--   - sgs_pro_propuesta_punto (FK a quebrada, en cada punto)
--
-- Para Phase 2, permitimos NULL en id_quebrada y dejamos los registros sin
-- asociación a quebrada. Phase 3 puede poblar bcs_dh_quebrada con spatial
-- join desde las geometrías de los puntos de propuesta.
--
-- Rollback manual:
--   ALTER TABLE sgs_pro_propuesta      ALTER COLUMN id_quebrada SET NOT NULL;
--   ALTER TABLE sgs_pro_propuesta_punto ALTER COLUMN id_quebrada SET NOT NULL;
-- =============================================================================

ALTER TABLE sgs_pro_propuesta       ALTER COLUMN id_quebrada DROP NOT NULL;
ALTER TABLE sgs_pro_propuesta_punto ALTER COLUMN id_quebrada DROP NOT NULL;
