-- =============================================================================
-- Migration 33 — Workflow de intervenciones con máquina de estados
--
-- Sprint 20 (P0 del plan v1.0). Workflow real de aprobación:
--   BORRADOR → EN_REVISION → APROBADA → EN_EJECUCION → FINALIZADA
--                          ↘ RECHAZADA → BORRADOR (re-apertura)
--
-- Cambios:
-- 1. Reemplaza el check constraint de estado con 6 valores
-- 2. Migra datos existentes: Pendiente → BORRADOR, En ejecución → EN_EJECUCION,
--    Finalizada → FINALIZADA
-- 3. Crea tabla sgs_pro_estado_historial con auditoría completa
-- 4. Backfill: 1 fila por propuesta con estado inicial BORRADOR + created_at
-- =============================================================================

-- 1. Quitar constraint viejo
ALTER TABLE sgs_pro_propuesta
  DROP CONSTRAINT IF EXISTS chk_pro_estado;

-- 2. Migrar valores existentes al nuevo vocabulario
UPDATE sgs_pro_propuesta
SET estado = CASE
  WHEN estado = 'Pendiente'    THEN 'BORRADOR'
  WHEN estado = 'En ejecución' THEN 'EN_EJECUCION'
  WHEN estado = 'Finalizada'   THEN 'FINALIZADA'
  ELSE 'BORRADOR'  -- fallback defensivo
END
WHERE estado IN ('Pendiente', 'En ejecución', 'Finalizada');

-- 3. Crear nueva columna estado_viejo (auditoría) — opcional, comentada
-- ALTER TABLE sgs_pro_propuesta ADD COLUMN IF NOT EXISTS estado_viejo VARCHAR(32);

-- 4. Re-añadir el check constraint con 6 estados
ALTER TABLE sgs_pro_propuesta
  ADD CONSTRAINT chk_pro_estado CHECK (estado IN (
    'BORRADOR', 'EN_REVISION', 'APROBADA', 'EN_EJECUCION', 'FINALIZADA', 'RECHAZADA'
  ));

COMMENT ON COLUMN sgs_pro_propuesta.estado IS
  'Workflow de aprobación (Sprint 20):
   BORRADOR → creada, editable por GESTOR
   EN_REVISION → enviada para revisión, bloqueada
   APROBADA → aprobada por ADMIN/ANALISTA, lista para ejecutar
   EN_EJECUCION → en ejecución
   FINALIZADA → terminada (terminal, salvo re-apertura manual)
   RECHAZADA → rechazada en revisión (re-abrible a BORRADOR)';

-- 5. Tabla de historial
CREATE TABLE IF NOT EXISTS sgs_pro_estado_historial (
  id_historial      SERIAL PRIMARY KEY,
  id_propuesta      INTEGER NOT NULL REFERENCES sgs_pro_propuesta(id_propuesta) ON DELETE CASCADE,
  estado_anterior   VARCHAR(32),                 -- NULL para el estado inicial
  estado_nuevo      VARCHAR(32) NOT NULL,
  usuario           VARCHAR(100),                 -- email o nombre
  rol               VARCHAR(20),                  -- ADMIN | ANALISTA | GESTOR
  comentario        TEXT,                        -- opcional, justificación
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historial_propuesta
  ON sgs_pro_estado_historial (id_propuesta, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_historial_created
  ON sgs_pro_estado_historial (created_at DESC);

COMMENT ON TABLE sgs_pro_estado_historial IS
  'Auditoría completa de cambios de estado. Backfill con migración 33.';

-- 6. Backfill: una fila por propuesta con estado inicial
-- (estado_anterior NULL → estado_nuevo = estado actual)
INSERT INTO sgs_pro_estado_historial (id_propuesta, estado_anterior, estado_nuevo, usuario, rol, comentario, created_at)
SELECT
  p.id_propuesta,
  NULL,
  p.estado,
  'migracion',
  'SYSTEM',
  'Backfill migration 33 — workflow de intervenciones',
  now()
FROM sgs_pro_propuesta p
WHERE NOT EXISTS (
  SELECT 1 FROM sgs_pro_estado_historial h WHERE h.id_propuesta = p.id_propuesta
);

-- 7. ANALYZE
ANALYZE sgs_pro_propuesta;
ANALYZE sgs_pro_estado_historial;
