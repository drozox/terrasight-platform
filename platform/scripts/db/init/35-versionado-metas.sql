-- =============================================================================
-- Migration 35 — Versionado de metas del convenio con snapshots
--
-- Sprint 22 (P1 del plan v1.0). Habilita:
--   - Snapshots del cálculo de metas en fechas específicas
--   - Comparar dos versiones para ver el avance entre fechas
--   - Auditoría de quién creó cada snapshot y por qué
--
-- Tabla sgs_adm_meta_snapshot guarda el JSON completo de las metas
-- calculadas en un momento dado. Permite comparaciones históricas sin
-- tener que recargar la BD con datos viejos.
-- =============================================================================

CREATE TABLE IF NOT EXISTS sgs_adm_meta_snapshot (
  id_snapshot     SERIAL PRIMARY KEY,
  fecha_corte     DATE NOT NULL,
  descripcion     VARCHAR(255),
  snapshot        JSONB NOT NULL,             -- { c1a1: {actual, meta, pct}, c1a2: {...}, ... }
  usuario         VARCHAR(100) NOT NULL,      -- quién lo creó
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fecha_corte)
);

CREATE INDEX IF NOT EXISTS idx_meta_snapshot_fecha
  ON sgs_adm_meta_snapshot (fecha_corte DESC);

COMMENT ON TABLE sgs_adm_meta_snapshot IS
  'Snapshots del cálculo de metas del convenio. Permite ver avance histórico
   y comparar versiones. UNIQUE en fecha_corte (1 snapshot por día).';

-- Tabla de comparaciones (opcional, pero útil para auditorías)
CREATE TABLE IF NOT EXISTS sgs_adm_meta_comparacion (
  id_comparacion  SERIAL PRIMARY KEY,
  id_snapshot_a    INTEGER NOT NULL REFERENCES sgs_adm_meta_snapshot(id_snapshot),
  id_snapshot_b    INTEGER NOT NULL REFERENCES sgs_adm_meta_snapshot(id_snapshot),
  diff             JSONB NOT NULL,            -- { meta: { antes, despues, delta } }
  usuario          VARCHAR(100) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_comparacion_snapshots
  ON sgs_adm_meta_comparacion (id_snapshot_a, id_snapshot_b);

COMMENT ON TABLE sgs_adm_meta_comparacion IS
  'Comparaciones pre-calculadas entre dos snapshots. Útil para reportes
   de avance trimestrales sin recalcular cada vez.';

ANALYZE sgs_adm_meta_snapshot;
ANALYZE sgs_adm_meta_comparacion;
