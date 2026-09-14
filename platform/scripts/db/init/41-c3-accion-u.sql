-- =============================================================================
-- 41-c3-accion-u.sql — DEEPSEEK-F4 (corrección post-feedback)
--
-- Agrega la acción "U" (única) para C3 (modelo BDG: C3AU = C3 - Acción Única).
-- Las migraciones 01-schema.sql y 13-c3-metas.sql solo crearon A1 y A2 para C3,
-- siguiendo el patrón 3×2 = 6 acciones. Pero el spec del convenio dice
-- explícitamente "C3 tiene 1 sola acción (U)".
--
-- Esta migración agrega U a C3 de forma idempotente.
--
-- IMPORTANTE: la migración 40 (sgs_v_indicador_*) usa `a.nombre = 'U'` para
-- filtrar C3 — sin esta fila, el indicador `predios_c3` daría 0.
-- =============================================================================

INSERT INTO sgs_com_accion (nombre, id_componente)
SELECT 'U', c.id_componente
FROM   sgs_com_componente c
WHERE  c.nombre = 'C3'
  AND  NOT EXISTS (
    SELECT 1
    FROM   sgs_com_accion a
    WHERE  a.nombre = 'U'
      AND  a.id_componente = c.id_componente
  );

-- Ampliamos el CHECK constraint para que admita "U" además de A1/A2.
-- (El constraint actual chk_pro_estado está en sgs_pro_propuesta; este es
-- sobre el nombre de la acción.)
ALTER TABLE sgs_com_accion DROP CONSTRAINT IF EXISTS sgs_com_accion_nombre_check;

ALTER TABLE sgs_com_accion
  ADD CONSTRAINT sgs_com_accion_nombre_check
  CHECK (nombre IN ('A1', 'A2', 'U'));

COMMENT ON CONSTRAINT sgs_com_accion_nombre_check ON sgs_com_accion IS
  'Acción válida: A1, A2 (componentes 1, 2, 3) o U (única para C3). DEEPSEEK-F4.';
