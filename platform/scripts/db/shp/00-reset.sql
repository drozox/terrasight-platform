-- =============================================================================
-- Reset geometrías cargadas y staging - ejecutar antes de recargar con SRIDs correctos
-- =============================================================================
BEGIN;

-- Eliminar municipios/veredas/biomas/coberturas agregados desde el shape (id > 7 los mpios, etc)
-- Mejor: resetear solo los nuevos inserts del script 01-upsert-referencias

-- Para municipios: los del shape tienen codigo_administrativo = 25377/25653/25779
DELETE FROM bcs_lpa_municipio WHERE codigo_administrativo IN ('25377', '25653', '25779');
-- Para veredas: las del shape son las que NO tienen codigo del seed (76001-*, 76520-*, 76892-*)
DELETE FROM bcs_lpa_vereda WHERE codigo_administrativo !~ '^(76001|76520|76892)-';
-- Para biomas y cobertura: borrar los que tienen geom y NO están en el seed inicial
-- (los del seed no tenían geom; los del shape sí)
DELETE FROM sgs_amb_bioma WHERE geom IS NOT NULL;
DELETE FROM sgs_amb_cobertura_clc WHERE geom IS NOT NULL;

-- Drop staging
DROP TABLE IF EXISTS public.stg_municipio CASCADE;
DROP TABLE IF EXISTS public.stg_vereda CASCADE;
DROP TABLE IF EXISTS public.stg_bioma CASCADE;
DROP TABLE IF EXISTS public.stg_cobertura CASCADE;
DROP TABLE IF EXISTS public.stg_predio CASCADE;
DROP TABLE IF EXISTS public.stg_via CASCADE;
DROP TABLE IF EXISTS public.stg_drenaje_simple CASCADE;
DROP TABLE IF EXISTS public.stg_drenaje_doble CASCADE;
DROP TABLE IF EXISTS public.stg_propuesta_linea CASCADE;

COMMIT;

SELECT 'municipios' AS tabla, COUNT(*) FROM bcs_lpa_municipio
UNION ALL SELECT 'veredas', COUNT(*) FROM bcs_lpa_vereda
UNION ALL SELECT 'biomas', COUNT(*) FROM sgs_amb_bioma
UNION ALL SELECT 'coberturas', COUNT(*) FROM sgs_amb_cobertura_clc;