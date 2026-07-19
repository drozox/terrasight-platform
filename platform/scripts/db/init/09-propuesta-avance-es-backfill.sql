-- =============================================================================
-- 09-propuesta-avance-es-backfill.sql
-- Marca las filas del backfill de la migración 06 para que las queries de
-- "último avance real" las puedan filtrar sin depender del texto de la nota
-- ni de `id_usuario IS NULL` (que ya no será un proxy fiable).
-- =============================================================================

ALTER TABLE sgs_pro_propuesta_avance
    ADD COLUMN IF NOT EXISTS es_backfill BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN sgs_pro_propuesta_avance.es_backfill IS
  'TRUE si la fila fue sembrada por el backfill de la migración 06 (valores
   20/75/100 derivados del tipo). Las queries de "último avance real" deben
   filtrar WHERE es_backfill = FALSE.';

UPDATE sgs_pro_propuesta_avance
SET    es_backfill = TRUE
WHERE  nota = 'Backfill inicial (migración 06)'
  AND  es_backfill = FALSE;

CREATE INDEX IF NOT EXISTS idx_sgs_pro_propuesta_avance_vigente
    ON sgs_pro_propuesta_avance (id_propuesta, created_at DESC)
    WHERE es_backfill = FALSE;
