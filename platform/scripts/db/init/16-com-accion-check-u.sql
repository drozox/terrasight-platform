-- =============================================================================
-- Permitir 'U' como nombre de acción (Phase 2)
--
-- El GDB del convenio tiene 3 acciones en propuesta_punto: A1, A2, U.
-- La 'U' representa probablemente "Unidad" o algún caso especial no
-- documentado. El CHECK constraint de 01-schema solo permite A1/A2.
--
-- Ampliamos el CHECK para incluir 'U'. Si en el futuro hay más, agregar.
--
-- Rollback manual:
--   ALTER TABLE sgs_com_accion
--     ADD CONSTRAINT sgs_com_accion_nombre_check
--     CHECK (nombre IN ('A1', 'A2'));
-- =============================================================================

ALTER TABLE sgs_com_accion DROP CONSTRAINT IF EXISTS sgs_com_accion_nombre_check;
ALTER TABLE sgs_com_accion
  ADD CONSTRAINT sgs_com_accion_nombre_check
  CHECK (nombre IN ('A1', 'A2', 'U'));
