-- =============================================================================
-- Permitir NULL en id_municipio + drop geom type en drenaje (Phase 2)
--
-- Los drenaje del GDB no tienen id_municipio. Se puede derivar por spatial
-- join (~30% match). El resto queda NULL.
--
-- Para drenaje_doble: el GDB tiene MultiPolygon pero el schema esperaba
-- MultiLineString. Cambiamos a GEOMETRY(GEOMETRY) sin restricción de tipo.
-- =============================================================================

ALTER TABLE sgs_inf_drenaje_simple ALTER COLUMN id_municipio DROP NOT NULL;
ALTER TABLE sgs_inf_drenaje_doble  ALTER COLUMN id_municipio DROP NOT NULL;
