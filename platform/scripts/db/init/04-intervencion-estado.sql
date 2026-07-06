-- =============================================================================
-- 04-intervencion-estado.sql
--
-- Agrega columna `estado` a `sgs_pro_propuesta` para que el GESTOR pueda
-- actualizar el avance de la intervención sin que el cálculo derive del tipo
-- de geometría (que era el comportamiento histórico).
--
-- Estados:
--   'Pendiente'     — creada pero no comenzada
--   'En ejecución'  — avance parcial (default para filas existentes)
--   'Finalizada'    — completa
--
-- Backfill:
--   Para las filas existentes, se respeta el cálculo histórico (punto=En
--   ejecución, linea=En ejecución, poligono=Finalizada). Si el cliente
--   prefiere otra distribución para las preexistentes, basta con correr el
--   UPDATE de abajo con la lógica que quiera.
-- =============================================================================

ALTER TABLE sgs_pro_propuesta
    ADD COLUMN IF NOT EXISTS estado VARCHAR(32) NOT NULL DEFAULT 'En ejecución';

ALTER TABLE sgs_pro_propuesta
    DROP CONSTRAINT IF EXISTS chk_pro_estado;

ALTER TABLE sgs_pro_propuesta
    ADD CONSTRAINT chk_pro_estado CHECK (estado IN ('Pendiente', 'En ejecución', 'Finalizada'));

COMMENT ON COLUMN sgs_pro_propuesta.estado IS
  'Estado operativo de la propuesta. Editable por ADMIN | GESTOR. Default En ejecución para filas preexistentes.';

-- Backfill: polígonos ya eran los únicos que se consideraban finalizados.
UPDATE sgs_pro_propuesta
SET    estado = CASE
                  WHEN tipo = 'poligono' THEN 'Finalizada'
                  ELSE 'En ejecución'
                END
WHERE  estado = 'En ejecución';  -- idempotente: si ya está OK, no hace nada

CREATE INDEX IF NOT EXISTS idx_pro_propuesta_estado ON sgs_pro_propuesta (estado);
