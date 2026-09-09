-- =============================================================================
-- Migration 34 — Tablas de importación masiva
--
-- Sprint 21 (P1 del plan v1.0). Habilita importar predios, propuestas, etc.
-- desde CSV/Excel/KML. Cada lote de importación se audita en
-- sgs_adm_importacion, y los errores de validación van a
-- sgs_adm_importacion_error con referencia a la fila del CSV.
--
-- Whitelist de "tipo de entidad" importa a tablas existentes.
-- =============================================================================

CREATE TABLE IF NOT EXISTS sgs_adm_importacion (
  id_importacion   SERIAL PRIMARY KEY,
  tipo_entidad     VARCHAR(32) NOT NULL,
  nombre_archivo   VARCHAR(255) NOT NULL,
  usuario          VARCHAR(100) NOT NULL,
  estado           VARCHAR(32) NOT NULL DEFAULT 'EN_PROCESO'
                    CHECK (estado IN ('EN_PROCESO', 'COMPLETADO', 'COMPLETADO_CON_ERRORES', 'FALLIDO')),
  total_filas      INTEGER NOT NULL DEFAULT 0,
  filas_exitosas   INTEGER NOT NULL DEFAULT 0,
  filas_con_error  INTEGER NOT NULL DEFAULT 0,
  comentario       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ
);

COMMENT ON TABLE sgs_adm_importacion IS
  'Auditoría de importaciones masivas. Una fila por lote subido.';

CREATE TABLE IF NOT EXISTS sgs_adm_importacion_error (
  id_error         SERIAL PRIMARY KEY,
  id_importacion   INTEGER NOT NULL REFERENCES sgs_adm_importacion(id_importacion) ON DELETE CASCADE,
  fila             INTEGER NOT NULL,           -- número de fila en el CSV (1-indexed, 0 = header)
  columna          VARCHAR(64),                -- nombre de la columna (NULL si error de archivo completo)
  valor            TEXT,                       -- valor problemático (truncado a 500 chars)
  mensaje          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_importacion_error
  ON sgs_adm_importacion_error (id_importacion);

CREATE INDEX IF NOT EXISTS idx_importacion_usuario
  ON sgs_adm_importacion (usuario, created_at DESC);

COMMENT ON TABLE sgs_adm_importacion_error IS
  'Errores de validación por fila. Permite mostrar preview en UI con los problemas.';

ANALYZE sgs_adm_importacion;
ANALYZE sgs_adm_importacion_error;
