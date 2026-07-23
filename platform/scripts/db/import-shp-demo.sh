#!/usr/bin/env bash
# =============================================================================
# DEBT-3.6 — Re-import completo de geografía desde los SHPs de demo del
# Convenio CAR Cundinamarca – WWF – Fundación Natura.
#
# Ubicación: scripts/db/import-shp-demo.sh
# Uso:
#   1. Copiar SHPs al container: docker cp <archivos.shp/.dbf/.prj> terrasight-db:/tmp/shps/
#   2. Ejecutar: docker exec -i terrasight-db bash < scripts/db/import-shp-demo.sh
#
# Comportamiento:
#   - TRUNCATE todas las tablas de geografía (preserva schema, FKs).
#   - ogr2ogr reproyecta cada SHP a SRID 4686 (lee .prj directo).
#   - shp2pgsql carga el SHP reproyectado a tabla temp.
#   - INSERT INTO ... SELECT con mapeo de campos DBF → columnas del schema.
# =============================================================================

set -euo pipefail

SHP_DIR="${SHP_DIR:-/tmp/shps}"
export PGPASSWORD=terrasight_dev
PSQL="psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1"

# --- 1. Truncar todo (orden inverso de FKs) ---
echo "=== Truncating geography tables ==="
$PSQL -q <<'SQL'
TRUNCATE TABLE
  sgs_rel_propuesta_punto_usuario,
  sgs_pro_propuesta_avance,
  sgs_pro_propuesta_punto,
  sgs_pro_propuesta_poligono,
  sgs_pro_propuesta_linea,
  sgs_pro_propuesta,
  sgs_rel_predio_cobertura,
  sgs_rel_predio_bioma,
  sgs_rel_predio_paramos,
  sgs_rel_predio_zonificacion_pomca,
  sgs_rel_predio_zonificacion_rfp,
  sgs_amb_cobertura_clc,
  sgs_amb_bioma,
  sgs_amb_paramos,
  sgs_amb_zonificacion_pomca,
  sgs_amb_zonificacion_rfp,
  sgs_pre_predio,
  sgs_pre_propietario,
  sgs_pre_usuario,
  sgs_inf_drenaje_doble,
  sgs_inf_drenaje_simple,
  sgs_inf_via,
  bcs_dh_quebrada,
  bcs_dh_microcuenca,
  bcs_lpa_vereda,
  bcs_lpa_municipio
RESTART IDENTITY CASCADE;
SQL

# --- 2. Helper: importar SHP a tabla temp ---
# shp2pgsql con códigos EPSG falla para "Origen_Unico" (no estándar).
# Usamos ogr2ogr para reproyectar leyendo el .prj directamente.
import_shp() {
  local shp_file="$1"
  local target_table="$2"
  local reprojected="/tmp/reproj_${target_table}.shp"
  echo "=== Importing $shp_file -> $target_table ==="
  ogr2ogr -f "ESRI Shapefile" -t_srs "EPSG:4686" \
    -lco ENCODING=UTF-8 -overwrite "$reprojected" "$shp_file" >/dev/null 2>&1
  shp2pgsql -s 4686 -I -W UTF-8 -t 2D "$reprojected" "tmp_${target_table}" 2>/dev/null | $PSQL -q
  rm -f /tmp/reproj_${target_table}.*
}

# --- 3. Municipios ---
import_shp "$SHP_DIR/bcs_lpa_municipio_C1A1.shp" "bcs_lpa_municipio"
$PSQL -q <<'SQL'
INSERT INTO bcs_lpa_municipio (nombre_municipio, codigo_administrativo, departamento, geom)
SELECT mpio_cnmbr, dpto_ccdgo || mpio_ccdgo, dpto_cnmbr, ST_Multi(geom)
FROM tmp_bcs_lpa_municipio WHERE ST_IsValid(geom);
DROP TABLE tmp_bcs_lpa_municipio;
SQL

# --- 4. Veredas ---
import_shp "$SHP_DIR/bcs_lpa_vereda_C1_A1.shp" "bcs_lpa_vereda"
# El SHP de veredas cubre más municipios que el SHP de municipio. Agregar
# los faltantes (CHOACHÍ, FÚQUENE) con geom placeholder.
$PSQL -q <<'SQL'
INSERT INTO bcs_lpa_municipio (nombre_municipio, codigo_administrativo, departamento, geom)
SELECT DISTINCT v.municipio, v.codigo_mun, 'CUNDINAMARCA',
  ST_Multi(ST_Buffer(ST_SetSRID(ST_MakePoint(
    ST_X(ST_Centroid(ST_Extent(v.geom))),
    ST_Y(ST_Centroid(ST_Extent(v.geom)))
  ), 4686), 0.001))
FROM tmp_bcs_lpa_vereda v
LEFT JOIN bcs_lpa_municipio m ON m.nombre_municipio = v.municipio
WHERE m.id_municipio IS NULL
GROUP BY v.municipio, v.codigo_mun;

INSERT INTO bcs_lpa_vereda (nombre_vereda, codigo_administrativo, id_municipio, geom)
SELECT v.nombre, v.cod_vereda, m.id_municipio, ST_Multi(v.geom)
FROM tmp_bcs_lpa_vereda v
JOIN bcs_lpa_municipio m ON m.nombre_municipio = v.municipio
WHERE ST_IsValid(v.geom);
DROP TABLE tmp_bcs_lpa_vereda;
SQL

# --- 5. Propietarios demo ---
$PSQL -q <<'SQL'
INSERT INTO sgs_pre_propietario (nombre_razon_social, telefono)
SELECT 'Propietario Demo ' || m.nombre_municipio, '+57 1 555 0000'
FROM bcs_lpa_municipio m;
SQL

# --- 6. Predios ---
import_shp "$SHP_DIR/sgs_pre_predio.shp" "sgs_pre_predio"
$PSQL -q <<'SQL'
INSERT INTO sgs_pre_predio (
  nombre_predio, area_ha, cedula_catastral, cedula_ant,
  longitud_centroide, latitud_centroide, nucleo_predial, observaciones,
  perimetro, id_propietario, id_vereda, geom
)
SELECT
  p.nucpredio,
  COALESCE(p.area_ha, 0),
  COALESCE(p.nucpredio, 'SIN-CATASTRAL'),
  '',
  ST_Y(ST_Centroid(p.geom))::numeric(12,6),
  ST_X(ST_Centroid(p.geom))::numeric(12,6),
  p.nucpredio,
  'Importado desde SHP demo',
  COALESCE(p.perimetro, 0),
  (SELECT id_propietario FROM sgs_pre_propietario LIMIT 1),
  (SELECT id_vereda FROM bcs_lpa_vereda LIMIT 1),
  ST_Multi(p.geom)
FROM tmp_sgs_pre_predio p WHERE ST_IsValid(p.geom);
DROP TABLE tmp_sgs_pre_predio;
SQL

# --- 7. Biomas ---
import_shp "$SHP_DIR/sgs_amb_bioma.shp" "sgs_amb_bioma"
$PSQL -q <<'SQL'
INSERT INTO sgs_amb_bioma (bioma_iavh, area_ha, area_m2, geom)
SELECT b.bioma_iavh, COALESCE(b.area_ha, 0), COALESCE(b.area_ha, 0) * 10000, ST_Multi(b.geom)
FROM tmp_sgs_amb_bioma b WHERE ST_IsValid(b.geom);
DROP TABLE tmp_sgs_amb_bioma;
SQL

# --- 8. Drenajes simples ---
import_shp "$SHP_DIR/sgs_inf_drenaje_simple.shp" "sgs_inf_drenaje_simple"
$PSQL -q <<'SQL'
INSERT INTO sgs_inf_drenaje_simple (nombre_geografico, estado_drenaje, id_municipio, geom)
SELECT
  COALESCE(d.nombre_geo, 'Drenaje ' || ROW_NUMBER() OVER ()),
  CASE d.estado_dre WHEN 1 THEN 'Funcional' WHEN 2 THEN 'Obstruido' WHEN 3 THEN 'En mal estado' ELSE 'Sin clasificar' END,
  (SELECT id_municipio FROM bcs_lpa_municipio LIMIT 1),
  ST_Multi(d.geom)
FROM tmp_sgs_inf_drenaje_simple d WHERE ST_IsValid(d.geom);
DROP TABLE tmp_sgs_inf_drenaje_simple;
SQL

# --- 9. Drenajes dobles (SHP viene como Polygon, tabla es MultiLineString) ---
import_shp "$SHP_DIR/sgs_inf_drenaje_doble.shp" "sgs_inf_drenaje_doble"
$PSQL -q <<'SQL'
INSERT INTO sgs_inf_drenaje_doble (id_municipio, geom)
SELECT
  (SELECT id_municipio FROM bcs_lpa_municipio LIMIT 1),
  ST_Multi(ST_Boundary(geom))
FROM tmp_sgs_inf_drenaje_doble WHERE ST_IsValid(geom);
DROP TABLE tmp_sgs_inf_drenaje_doble;
SQL

# --- 10. Vías ---
import_shp "$SHP_DIR/sgs_inf_via.shp" "sgs_inf_via"
$PSQL -q <<'SQL'
INSERT INTO sgs_inf_via (tipo_via, estado_superficie, numero_carriles, accesibilidad, id_municipio, geom)
SELECT
  CASE v.tipo_via WHEN 1 THEN 'primaria' WHEN 2 THEN 'secundaria' WHEN 3 THEN 'terciaria' ELSE 'secundaria' END,
  CASE LOWER(COALESCE(v.estado_sup, 'tierra'))
    WHEN 'pavimento' THEN 'pavimento'
    WHEN 'pavimentado' THEN 'pavimento'
    WHEN 'afirmado' THEN 'afirmado'
    WHEN 'tierra' THEN 'tierra'
    WHEN 'sin pavimentar' THEN 'tierra'
    ELSE 'tierra'
  END,
  CASE WHEN v.numero_car ~ '^[0-9]+$' THEN v.numero_car::int ELSE 1 END,
  COALESCE(v.accesibili, 'tierra'),
  (SELECT id_municipio FROM bcs_lpa_municipio LIMIT 1),
  ST_Multi(v.geom)
FROM tmp_sgs_inf_via v WHERE ST_IsValid(v.geom);
DROP TABLE tmp_sgs_inf_via;
SQL

# --- 11. Propuestas línea (1 propuesta por línea del SHP) ---
import_shp "$SHP_DIR/sgs_pro_propuesta_linea.shp" "sgs_pro_propuesta_linea"
$PSQL -q <<'SQL'
-- Microcuenca + quebrada placeholder (FK NOT NULL)
INSERT INTO bcs_dh_microcuenca (id_microcuenca, nombre_microcuenca, area, codigo, latitud, longitud, geom)
VALUES (1, 'Por asignar', 0, '0000', 0, 0,
  ST_Multi(ST_Buffer(ST_SetSRID(ST_MakePoint(0,0), 4686), 0.001)))
ON CONFLICT (id_microcuenca) DO NOTHING;
SELECT setval('bcs_dh_microcuenca_id_microcuenca_seq', GREATEST(1, (SELECT MAX(id_microcuenca) FROM bcs_dh_microcuenca)));

INSERT INTO bcs_dh_quebrada (id_quebrada, nombre_quebrada, longitud, latitud, id_municipio, id_microcuenca, geom)
VALUES (1, 'Por asignar', 0, 0,
  (SELECT id_municipio FROM bcs_lpa_municipio LIMIT 1),
  (SELECT id_microcuenca FROM bcs_dh_microcuenca LIMIT 1),
  ST_SetSRID(ST_GeomFromText('LINESTRING(0 0, 0.001 0.001)'), 4686))
ON CONFLICT (id_quebrada) DO NOTHING;
SELECT setval('bcs_dh_quebrada_id_quebrada_seq', GREATEST(1, (SELECT MAX(id_quebrada) FROM bcs_dh_quebrada)));

-- Cabecera: 1 propuesta por línea del SHP (id_propuesta explícito por línea)
WITH mov AS (SELECT id_accion FROM sgs_com_accion WHERE nombre = 'A2' LIMIT 1),
     pred AS (SELECT id_predio FROM sgs_pre_predio LIMIT 1),
     qbr AS (SELECT id_quebrada FROM bcs_dh_quebrada WHERE nombre_quebrada = 'Por asignar' LIMIT 1),
     lineas AS (
       SELECT l.*, ROW_NUMBER() OVER (ORDER BY l.gid) AS new_id
       FROM tmp_sgs_pro_propuesta_linea l
       WHERE ST_IsValid(l.geom)
     )
INSERT INTO sgs_pro_propuesta (id_propuesta, tipo, actividad, id_predio, id_quebrada, id_accion, estado)
SELECT 1000 + l.new_id,
  'linea',
  COALESCE(NULLIF(l.actividad, ''), 'Aislamiento de fuente hídrica'),
  pred.id_predio, qbr.id_quebrada, mov.id_accion, 'En ejecución'
FROM lineas l, pred, mov, qbr;
SELECT setval('sgs_pro_propuesta_id_propuesta_seq', (SELECT MAX(id_propuesta) FROM sgs_pro_propuesta));

-- Sub-tabla: cada línea → su propia sub-tabla
WITH lineas AS (
  SELECT l.*, ROW_NUMBER() OVER (ORDER BY l.gid) AS new_id
  FROM tmp_sgs_pro_propuesta_linea l
  WHERE ST_IsValid(l.geom)
)
INSERT INTO sgs_pro_propuesta_linea (actividad, longitud_m, longitud_km, id_propuesta, geom)
SELECT
  COALESCE(NULLIF(l.actividad, ''), 'Aislamiento de fuente hídrica'),
  ST_Length(l.geom::geography)::numeric(12,2),
  ST_Length(l.geom::geography) / 1000,
  1000 + l.new_id,
  l.geom
FROM lineas l;
DROP TABLE tmp_sgs_pro_propuesta_linea;
SQL

# --- 12. Alertas (re-seed desde migration 10) ---
$PSQL -q -f /docker-entrypoint-initdb.d/10-sgs-amb-alerta.sql 2>/dev/null || true

# --- 13. Conteos finales ---
echo ""
echo "=== Conteos finales ==="
$PSQL <<'SQL'
SELECT 'bcs_lpa_municipio' AS tabla, COUNT(*) FROM bcs_lpa_municipio
UNION ALL SELECT 'bcs_lpa_vereda', COUNT(*) FROM bcs_lpa_vereda
UNION ALL SELECT 'sgs_pre_propietario', COUNT(*) FROM sgs_pre_propietario
UNION ALL SELECT 'sgs_pre_predio', COUNT(*) FROM sgs_pre_predio
UNION ALL SELECT 'sgs_amb_bioma', COUNT(*) FROM sgs_amb_bioma
UNION ALL SELECT 'sgs_inf_drenaje_simple', COUNT(*) FROM sgs_inf_drenaje_simple
UNION ALL SELECT 'sgs_inf_drenaje_doble', COUNT(*) FROM sgs_inf_drenaje_doble
UNION ALL SELECT 'sgs_inf_via', COUNT(*) FROM sgs_inf_via
UNION ALL SELECT 'sgs_pro_propuesta', COUNT(*) FROM sgs_pro_propuesta
UNION ALL SELECT 'sgs_pro_propuesta_linea', COUNT(*) FROM sgs_pro_propuesta_linea
UNION ALL SELECT 'sgs_amb_alerta', COUNT(*) FROM sgs_amb_alerta
ORDER BY tabla;
SQL

# --- 14. Sanity check: bbox de cada capa (debe caer en Cundinamarca) ---
echo ""
echo "=== Bounding box Cundinamarca check ==="
$PSQL <<'SQL'
WITH bbox AS (
  SELECT 'municipio' AS layer,
    ROUND(MIN(ST_Y(ST_Centroid(geom)))::numeric, 3) AS min_lat,
    ROUND(MAX(ST_Y(ST_Centroid(geom)))::numeric, 3) AS max_lat,
    ROUND(MIN(ST_X(ST_Centroid(geom)))::numeric, 3) AS min_lon,
    ROUND(MAX(ST_X(ST_Centroid(geom)))::numeric, 3) AS max_lon
  FROM bcs_lpa_municipio
  UNION ALL SELECT 'predio', ROUND(MIN(ST_Y(ST_Centroid(geom)))::numeric, 3),
    ROUND(MAX(ST_Y(ST_Centroid(geom)))::numeric, 3),
    ROUND(MIN(ST_X(ST_Centroid(geom)))::numeric, 3),
    ROUND(MAX(ST_X(ST_Centroid(geom)))::numeric, 3)
  FROM sgs_pre_predio
  UNION ALL SELECT 'bioma', ROUND(MIN(ST_Y(ST_Centroid(geom)))::numeric, 3),
    ROUND(MAX(ST_Y(ST_Centroid(geom)))::numeric, 3),
    ROUND(MIN(ST_X(ST_Centroid(geom)))::numeric, 3),
    ROUND(MAX(ST_X(ST_Centroid(geom)))::numeric, 3)
  FROM sgs_amb_bioma
  UNION ALL SELECT 'drenaje_simple', ROUND(MIN(ST_Y(ST_StartPoint(geom)))::numeric, 3),
    ROUND(MAX(ST_Y(ST_StartPoint(geom)))::numeric, 3),
    ROUND(MIN(ST_X(ST_StartPoint(geom)))::numeric, 3),
    ROUND(MAX(ST_X(ST_StartPoint(geom)))::numeric, 3)
  FROM sgs_inf_drenaje_simple
  UNION ALL SELECT 'via', ROUND(MIN(ST_Y(ST_StartPoint(geom)))::numeric, 3),
    ROUND(MAX(ST_Y(ST_StartPoint(geom)))::numeric, 3),
    ROUND(MIN(ST_X(ST_StartPoint(geom)))::numeric, 3),
    ROUND(MAX(ST_X(ST_StartPoint(geom)))::numeric, 3)
  FROM sgs_inf_via
  UNION ALL SELECT 'propuesta_linea', ROUND(MIN(ST_Y(ST_StartPoint(geom)))::numeric, 3),
    ROUND(MAX(ST_Y(ST_StartPoint(geom)))::numeric, 3),
    ROUND(MIN(ST_X(ST_StartPoint(geom)))::numeric, 3),
    ROUND(MAX(ST_X(ST_StartPoint(geom)))::numeric, 3)
  FROM sgs_pro_propuesta_linea
)
SELECT *,
  CASE WHEN min_lat BETWEEN 4.0 AND 6.0 AND max_lat BETWEEN 4.0 AND 6.0
       AND min_lon BETWEEN -75.0 AND -73.0 AND max_lon BETWEEN -75.0 AND -73.0
    THEN 'OK (Cundinamarca)' ELSE 'FUERA DE RANGO!' END AS check_status
FROM bbox ORDER BY layer;
SQL
