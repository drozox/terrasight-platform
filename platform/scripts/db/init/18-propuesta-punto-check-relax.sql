-- =============================================================================
-- Relajar CHECK constraints de sgs_pro_propuesta_punto (Phase 2)
--
-- El GDB del convenio tiene 692 puntos con `tipo_obra` ∈ {0, 1, 2, 3}.
-- El schema original define:
--   - tipo_punto VARCHAR(30) CHECK (IN 5 valores)
--   - tipo_obra INTEGER CHECK (IN (1, 2, 3))
--
-- Para aceptar los datos reales del GDB (que tiene tipo_obra=0 también),
-- relajamos los CHECK constraints. Los valores quedan en la tabla como texto
-- o número pero sin restricción.
--
-- Si en el futuro se quiere re-restringir, ajustar los valores primero.
-- =============================================================================

ALTER TABLE sgs_pro_propuesta_punto DROP CONSTRAINT IF EXISTS sgs_pro_propuesta_punto_tipo_punto_check;
ALTER TABLE sgs_pro_propuesta_punto DROP CONSTRAINT IF EXISTS sgs_pro_propuesta_punto_tipo_obra_check;
ALTER TABLE sgs_pro_propuesta_punto DROP CONSTRAINT IF EXISTS sgs_pro_propuesta_punto_tipo_obra_check1;
