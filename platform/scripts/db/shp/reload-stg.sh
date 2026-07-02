#!/bin/bash
# Reload all staging tables with CORRECT source SRIDs
set +e
echo "=== Municipio (CTM12 -> 4686) ==="
shp2pgsql -s 9377:4686 -t 2D -g geom -I -W UTF-8 /tmp/shp/bcs_lpa_municipio_C1A1.shp public.stg_municipio 2>/dev/null | psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 -q

echo "=== Vereda (Web Mercator -> 4686) ==="
shp2pgsql -s 3857:4686 -t 2D -g geom -I -W UTF-8 /tmp/shp/bcs_lpa_vereda_C1_A1.shp public.stg_vereda 2>/dev/null | psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 -q

echo "=== Bioma (4686 -> 4686) ==="
shp2pgsql -s 4686 -t 2D -g geom -I -W UTF-8 /tmp/shp/sgs_amb_bioma.shp public.stg_bioma 2>/dev/null | psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 -q

echo "=== Cobertura (UTM18N -> 4686) ==="
shp2pgsql -s 32618:4686 -t 2D -g geom -I -W UTF-8 /tmp/shp/sgs_amb_cobertura_clc.shp public.stg_cobertura 2>/dev/null | psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 -q

echo "=== Predio (CTM12 -> 4686) ==="
shp2pgsql -s 9377:4686 -t 2D -g geom -I -W UTF-8 /tmp/shp/sgs_pre_predio.shp public.stg_predio 2>/dev/null | psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 -q

echo "=== Via (Bogota zone -> 4686) ==="
shp2pgsql -s 3116:4686 -t 2D -g geom -I -W UTF-8 /tmp/shp/sgs_inf_via.shp public.stg_via 2>/dev/null | psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 -q

echo "=== Drenaje simple (Bogota zone -> 4686) ==="
shp2pgsql -s 3116:4686 -t 2D -g geom -I -W UTF-8 /tmp/shp/sgs_inf_drenaje_simple.shp public.stg_drenaje_simple 2>/dev/null | psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 -q

echo "=== Drenaje doble (Bogota zone -> 4686) ==="
shp2pgsql -s 3116:4686 -t 2D -g geom -I -W UTF-8 /tmp/shp/sgs_inf_drenaje_doble.shp public.stg_drenaje_doble 2>/dev/null | psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 -q

echo "=== Propuesta linea (CTM12 -> 4686) ==="
shp2pgsql -s 9377:4686 -t 2D -g geom -I -W UTF-8 /tmp/shp/sgs_pro_propuesta_linea.shp public.stg_propuesta_linea 2>/dev/null | psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 -q

echo "=== ALL DONE ==="
psql -U terrasight -d convenio_car_wwf -c "
SELECT 'stg_municipio' AS t, COUNT(*) AS n, round(MIN(ST_XMin(geom))::numeric,3) AS xmin, round(MIN(ST_YMin(geom))::numeric,3) AS ymin FROM public.stg_municipio UNION ALL
SELECT 'stg_vereda', COUNT(*), round(MIN(ST_XMin(geom))::numeric,3), round(MIN(ST_YMin(geom))::numeric,3) FROM public.stg_vereda UNION ALL
SELECT 'stg_bioma', COUNT(*), round(MIN(ST_XMin(geom))::numeric,3), round(MIN(ST_YMin(geom))::numeric,3) FROM public.stg_bioma UNION ALL
SELECT 'stg_cobertura', COUNT(*), round(MIN(ST_XMin(geom))::numeric,3), round(MIN(ST_YMin(geom))::numeric,3) FROM public.stg_cobertura UNION ALL
SELECT 'stg_predio', COUNT(*), round(MIN(ST_XMin(geom))::numeric,3), round(MIN(ST_YMin(geom))::numeric,3) FROM public.stg_predio UNION ALL
SELECT 'stg_via', COUNT(*), round(MIN(ST_XMin(geom))::numeric,3), round(MIN(ST_YMin(geom))::numeric,3) FROM public.stg_via UNION ALL
SELECT 'stg_drenaje_simple', COUNT(*), round(MIN(ST_XMin(geom))::numeric,3), round(MIN(ST_YMin(geom))::numeric,3) FROM public.stg_drenaje_simple UNION ALL
SELECT 'stg_drenaje_doble', COUNT(*), round(MIN(ST_XMin(geom))::numeric,3), round(MIN(ST_YMin(geom))::numeric,3) FROM public.stg_drenaje_doble UNION ALL
SELECT 'stg_propuesta_linea', COUNT(*), round(MIN(ST_XMin(geom))::numeric,3), round(MIN(ST_YMin(geom))::numeric,3) FROM public.stg_propuesta_linea
ORDER BY t;"