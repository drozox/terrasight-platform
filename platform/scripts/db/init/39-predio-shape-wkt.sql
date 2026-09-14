-- =============================================================================
-- Migration 39 — Soporte de shape completo en sgs_pre_predio (DEEPSEEK-F3.4)
--
-- Agrega columna `geom` (PostGIS MULTIPOLYGON, SRID 4686) para guardar el
-- shape completo del predio, no solo el centroide. Es la columna que se
-- alimenta desde WKT/GeoJSON en el form de alta (DEEPSEEK-F3.4).
--
-- El modelo BDG original tenía MULTIPOLYGON pero el import inicial lo
-- descartó por simplicidad (solo guardaba centroide). Con este cambio el
-- shape completo queda persistido y se puede usar para:
--   - Mapas con geometría real (no solo puntos)
--   - Intersect con capas Fase 6 (bioma, páramo, POMCA, RFP)
--   - Análisis de área/perímetro exactos desde el shape
-- =============================================================================

ALTER TABLE sgs_pre_predio
    ADD COLUMN IF NOT EXISTS geom GEOMETRY(MULTIPOLYGON, 4686);

CREATE INDEX IF NOT EXISTS idx_sgs_pre_predio_geom
    ON sgs_pre_predio USING GIST (geom);

COMMENT ON COLUMN sgs_pre_predio.geom IS 'Polígono MULTIPOLYGON (SRID 4686) del predio — DEEPSEEK-F3.4';
