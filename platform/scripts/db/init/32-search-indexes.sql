-- =============================================================================
-- Migration 32 — pg_trgm + GIN trigram indexes + GIST geom verification
--
-- Sprint 19 — UX-61 (audit 2026-07-24) hotfix: búsqueda transversal en topbar.
-- 1. Activa pg_trgm (similarity + GIN trigram indexes)
-- 2. Crea GIN indexes en columnas buscables: nombre de predios, propuestas,
--    municipios, veredas, propietarios. Aceleran ILIKE + unaccent.
-- 3. Crea GIST indexes en geom de las 5 capas más usadas en el mapa
--    (predios, vias, drenajes, propuestas, municipios, veredas).
--    Los GIST ya existían por la creación de las tablas; este script
--    los verifica y crea los que falten.
--
-- pg_trgm en Supabase:
--   - Habilitar: CREATE EXTENSION pg_trgm; (en schema público)
--   - Ya está disponible en el catálogo de Supabase, no requiere enable
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes para búsqueda transversal
-- (operador <-> de pg_trgm, también acelera ILIKE con trigram)
CREATE INDEX IF NOT EXISTS idx_predio_nombre_trgm
  ON sgs_pre_predio USING gin (nombre_predio gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_propuesta_actividad_trgm
  ON sgs_pro_propuesta USING gin (actividad gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_municipio_nombre_trgm
  ON bcs_lpa_municipio USING gin (nombre_municipio gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_vereda_nombre_trgm
  ON bcs_lpa_vereda USING gin (nombre_vereda gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_propietario_nombre_trgm
  ON sgs_pre_propietario USING gin (nombre_razon_social gin_trgm_ops);

-- Verificar GIST en geom (idempotente, IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_predio_geom_gist
  ON sgs_pre_predio USING gist (geom);

CREATE INDEX IF NOT EXISTS idx_via_geom_gist
  ON sgs_inf_via USING gist (geom);

CREATE INDEX IF NOT EXISTS idx_drenaje_simple_geom_gist
  ON sgs_inf_drenaje_simple USING gist (geom);

CREATE INDEX IF NOT EXISTS idx_propuesta_poligono_geom_gist
  ON sgs_pro_propuesta_poligono USING gist (geom);

CREATE INDEX IF NOT EXISTS idx_municipio_geom_gist
  ON bcs_lpa_municipio USING gist (geom);

CREATE INDEX IF NOT EXISTS idx_vereda_geom_gist
  ON bcs_lpa_vereda USING gist (geom);

-- ANALYZE: actualiza estadísticas del planner con los nuevos índices
ANALYZE sgs_pre_predio;
ANALYZE sgs_pro_propuesta;
ANALYZE sgs_pro_propuesta_punto;
ANALYZE sgs_pro_propuesta_linea;
ANALYZE sgs_pro_propuesta_poligono;
ANALYZE sgs_inf_via;
ANALYZE sgs_inf_drenaje_simple;
ANALYZE bcs_lpa_municipio;
ANALYZE bcs_lpa_vereda;
ANALYZE sgs_pre_propietario;
ANALYZE sgs_inf_drenaje_doble;
ANALYZE bcs_dh_quebrada;
