-- =============================================================================
-- Migration 25 — Relajar CHECK constraint de estado_naturalidad en cobertura
--
-- El CHECK original solo aceptaba 'natural', 'seminatural', 'transformado'
-- (en minúsculas exactas). El GDB tiene 'Natural', ' ', 'Semi' y otros
-- valores inconsistentes, así que relajamos el constraint.
-- =============================================================================

ALTER TABLE sgs_amb_cobertura_clc
  DROP CONSTRAINT IF EXISTS sgs_amb_cobertura_clc_estado_naturalidad_check;
