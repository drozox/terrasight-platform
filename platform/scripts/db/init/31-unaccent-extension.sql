-- =============================================================================
-- Migration 26-ext — Extension unaccent + recalcular longitud_km/area_ha
--
-- 1. Activa unaccent (necesario para queries de metas con tildes
--    en nombres de actividad: "Obras de captación" vs "captacion")
-- 2. Recalcula longitud_km/area_ha con ST_Length(geom::geography) y
--    ST_Area(geom::geography) — el campo geom está en SRID 4686
--    (geográfico, grados) y los cálculos deben hacerse sobre geography.
--
-- El script fix_long_area.mjs hace lo mismo. Esta migration lo deja en
-- el schema para que sea reproducible y se aplique automáticamente
-- en deploys futuros.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Recalcular longitudes (metros y km) de propuestas_línea
UPDATE sgs_pro_propuesta_linea
SET longitud_m  = ST_Length(geom::geography),
    longitud_km = ST_Length(geom::geography) / 1000.0
WHERE geom IS NOT NULL;

-- Recalcular áreas (m² y ha) de propuestas_polígono
UPDATE sgs_pro_propuesta_poligono
SET area_m2 = ST_Area(geom::geography),
    area_ha = ST_Area(geom::geography) / 10000.0
WHERE geom IS NOT NULL;
