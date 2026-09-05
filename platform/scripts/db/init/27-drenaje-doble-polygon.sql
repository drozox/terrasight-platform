-- =============================================================================
-- Migration 27 — sgs_inf_drenaje_doble: cambiar geom a MULTIPOLYGON
--
-- El GDB tiene los features de drenaje doble como MultiPolygon (el área del
-- cauce), no MultiLineString. El schema inicial los creó como MultiLineString
-- por error. Lo cambiamos para que coincida con la realidad.
-- =============================================================================

-- Drop and recreate the geom column with the correct type
ALTER TABLE sgs_inf_drenaje_doble
  DROP COLUMN IF EXISTS geom;
ALTER TABLE sgs_inf_drenaje_doble
  ADD COLUMN geom GEOMETRY(MULTIPOLYGON, 4686);
