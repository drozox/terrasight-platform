-- =============================================================================
-- Shapefile -> Tablas target: vias, drenajes, predios, propuesta_linea
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- A. PREDIOS (1 record del shape: "El Clavel", vereda Cuibuco, municipio San Cayetano)
-- Match por nombre_predio. Si no existe, INSERT como nuevo.
-- ---------------------------------------------------------------------------
INSERT INTO sgs_pre_predio (
    nombre_predio, area_ha, cedula_catastral, cedula_ant,
    longitud_centroide, latitud_centroide,
    nucleo_predial, observaciones, perimetro,
    id_propietario, id_vereda, geom
)
SELECT
    TRIM(p.nompredio) AS nombre_predio,
    COALESCE(p.area_ha, 0)::decimal(12,2),
    COALESCE('SHP-' || p.gid::text, 'SHP-' || p.gid::text) AS cedula_catastral,
    'SHP-ANT' AS cedula_ant,
    round(ST_X(ST_Centroid(p.geom))::numeric, 6) AS longitud_centroide,
    round(ST_Y(ST_Centroid(p.geom))::numeric, 6) AS latitud_centroide,
    TRIM(p.nucpredio) AS nucleo_predial,
    COALESCE(TRIM(p.comentario), 'Cargado desde shapefile sgs_pre_predio.shp') AS observaciones,
    COALESCE(p.perimetro, 0)::decimal(12,2),
    -- asignar propietario 1 (default) si no se puede matchear
    (SELECT id_propietario FROM sgs_pre_propietario ORDER BY id_propietario LIMIT 1) AS id_propietario,
    COALESCE(
      (SELECT v.id_vereda FROM bcs_lpa_vereda v
       JOIN bcs_lpa_municipio m ON v.id_municipio = m.id_municipio
       WHERE m.nombre_municipio ILIKE '%' || TRIM(p.municipio) || '%'
       ORDER BY v.id_vereda LIMIT 1),
      (SELECT id_vereda FROM bcs_lpa_vereda ORDER BY id_vereda LIMIT 1)
    ) AS id_vereda,
    p.geom
FROM public.stg_predio p
WHERE NOT EXISTS (
    SELECT 1 FROM sgs_pre_predio t
    WHERE t.nombre_predio = TRIM(p.nompredio)
       OR t.nucleo_predial = TRIM(p.nucpredio)
);

-- Para predios existentes, UPDATE geom y area si están NULL
UPDATE sgs_pre_predio t
SET geom = p.geom,
    area_ha = COALESCE(NULLIF(p.area_ha, 0), t.area_ha),
    perimetro = COALESCE(NULLIF(p.perimetro, 0), t.perimetro)
FROM public.stg_predio p
WHERE t.nombre_predio = TRIM(p.nompredio)
  AND t.geom IS NULL;

-- ---------------------------------------------------------------------------
-- B. VIAS (2295 records) - spatial join para id_municipio
-- ---------------------------------------------------------------------------
INSERT INTO sgs_inf_via (
    tipo_via, estado_superficie, numero_carriles, accesibilidad,
    id_municipio, geom
)
SELECT
    'secundaria' AS tipo_via,
    CASE TRIM(v.estado_sup)
      WHEN '3301' THEN 'pavimento'
      WHEN '3306' THEN 'afirmado'
      WHEN '3350' THEN 'tierra'
      WHEN 'Sin Valor' THEN 'afirmado'
      WHEN '' THEN 'afirmado'
      ELSE 'afirmado'
    END AS estado_superficie,
    CASE TRIM(v.numero_car)
      WHEN '3501' THEN 1
      WHEN '3502' THEN 2
      WHEN '3503' THEN 3
      WHEN '3504' THEN 4
      WHEN 'Sin Valor' THEN 1
      ELSE 1
    END AS numero_carriles,
    CASE TRIM(v.accesibili)
      WHEN '3600' THEN 'Vehicular alta capacidad'
      WHEN '3601' THEN 'Vehicular'
      WHEN 'Sin Valor' THEN 'Vehicular'
      ELSE 'Vehicular'
    END AS accesibilidad,
    COALESCE(
      (SELECT m.id_municipio FROM bcs_lpa_municipio m
       WHERE m.geom IS NOT NULL AND ST_Intersects(v.geom, m.geom)
       ORDER BY m.id_municipio LIMIT 1),
      (SELECT m.id_municipio FROM bcs_lpa_municipio m
       WHERE m.geom IS NOT NULL
       ORDER BY ST_Distance(v.geom, m.geom) ASC LIMIT 1),
      (SELECT id_municipio FROM bcs_lpa_municipio ORDER BY id_municipio LIMIT 1)
    ) AS id_municipio,
    v.geom
FROM public.stg_via v;

-- ---------------------------------------------------------------------------
-- C. DRENAJE SIMPLE (2985 records)
-- ---------------------------------------------------------------------------
INSERT INTO sgs_inf_drenaje_simple (
    estado_drenaje, nombre_geografico, id_municipio, geom
)
SELECT
    CASE v.estado_dre
      WHEN 5102 THEN 'Activo'
      WHEN 5101 THEN 'Inactivo'
      ELSE 'Activo'
    END AS estado_drenaje,
    COALESCE(NULLIF(TRIM(v.nombre_geo), ''), 'Drenaje ' || v.gid::text) AS nombre_geografico,
    COALESCE(
      (SELECT m.id_municipio FROM bcs_lpa_municipio m
       WHERE m.geom IS NOT NULL AND ST_Intersects(v.geom, m.geom)
       ORDER BY m.id_municipio LIMIT 1),
      (SELECT m.id_municipio FROM bcs_lpa_municipio m
       WHERE m.geom IS NOT NULL
       ORDER BY ST_Distance(v.geom, m.geom) ASC LIMIT 1),
      (SELECT id_municipio FROM bcs_lpa_municipio ORDER BY id_municipio LIMIT 1)
    ) AS id_municipio,
    v.geom
FROM public.stg_drenaje_simple v;

-- ---------------------------------------------------------------------------
-- D. DRENAJE DOBLE (27 records)
-- ---------------------------------------------------------------------------
INSERT INTO sgs_inf_drenaje_doble (
    tipo, nombre_geografico, id_municipio, geom
)
SELECT
    'Canal doble' AS tipo,
    COALESCE(NULLIF(TRIM(v.nombre_geo), ''), 'Drenaje doble ' || v.gid::text) AS nombre_geografico,
    COALESCE(
      (SELECT m.id_municipio FROM bcs_lpa_municipio m
       WHERE m.geom IS NOT NULL AND ST_Intersects(v.geom, m.geom)
       ORDER BY m.id_municipio LIMIT 1),
      (SELECT m.id_municipio FROM bcs_lpa_municipio m
       WHERE m.geom IS NOT NULL
       ORDER BY ST_Distance(v.geom, m.geom) ASC LIMIT 1),
      (SELECT id_municipio FROM bcs_lpa_municipio ORDER BY id_municipio LIMIT 1)
    ) AS id_municipio,
    -- shapefile trae MultiPolygon; convertir a MultiLineString con ST_Boundary
    ST_Multi(ST_Boundary(v.geom))::geometry(MultiLineString, 4686) AS geom
FROM public.stg_drenaje_doble v;

-- ---------------------------------------------------------------------------
-- E. PROPUESTAS LINEA (141 records) - crear super-tipo + sub-tipo
-- Cada shape crea su PROPIA propuesta_padre (1:1) para evitar colision UNIQUE
-- ---------------------------------------------------------------------------

-- E.1 Crear propuesta_padre para cada shape (CTE para id_propuesta nuevo por shape)
WITH staging_norm AS (
    SELECT
        gid,
        COALESCE(NULLIF(TRIM(actividad), ''), 'Cerco vivo') AS actividad,
        nucpredio,
        nompredio,
        COALESCE(long_m, 0)::decimal(12,2) AS long_m,
        COALESCE(long_km, long_m / 1000.0, 0)::decimal(12,2) AS long_km,
        geom
    FROM public.stg_propuesta_linea
),
predios_match AS (
    SELECT
        s.gid,
        COALESCE(
            (SELECT t.id_predio FROM sgs_pre_predio t
             WHERE t.nucleo_predial = TRIM(s.nucpredio)
                OR t.nombre_predio ILIKE '%' || TRIM(s.nompredio) || '%'
             ORDER BY t.id_predio LIMIT 1),
            (SELECT t.id_predio FROM sgs_pre_predio t
             WHERE t.geom IS NOT NULL
             ORDER BY ST_Distance(s.geom, t.geom) ASC LIMIT 1),
            (SELECT id_predio FROM sgs_pre_predio ORDER BY id_predio LIMIT 1)
        ) AS id_predio,
        COALESCE(
            (SELECT q.id_quebrada FROM bcs_dh_quebrada q
             WHERE q.geom IS NOT NULL
             ORDER BY ST_Distance(s.geom, q.geom) ASC LIMIT 1),
            (SELECT id_quebrada FROM bcs_dh_quebrada ORDER BY id_quebrada LIMIT 1)
        ) AS id_quebrada
    FROM staging_norm s
),
nuevas_propuestas AS (
    INSERT INTO sgs_pro_propuesta (tipo, actividad, id_predio, id_quebrada, id_accion)
    SELECT
        'linea',
        s.actividad,
        pm.id_predio,
        pm.id_quebrada,
        1
    FROM staging_norm s
    JOIN predios_match pm ON pm.gid = s.gid
    WHERE NOT EXISTS (
        SELECT 1 FROM sgs_pro_propuesta_linea pl
        WHERE pl.actividad = s.actividad
          AND ABS(pl.longitud_m - s.long_m) < 1
    )
    RETURNING id_propuesta
),
seq AS (
    SELECT id_propuesta, ROW_NUMBER() OVER (ORDER BY id_propuesta) AS rn
    FROM nuevas_propuestas
),
seq_src AS (
    SELECT gid, actividad, long_m, long_km, geom,
           ROW_NUMBER() OVER (ORDER BY gid) AS rn
    FROM staging_norm
    WHERE NOT EXISTS (
        SELECT 1 FROM sgs_pro_propuesta_linea pl
        WHERE pl.actividad = staging_norm.actividad
          AND ABS(pl.longitud_m - staging_norm.long_m) < 1
    )
)
INSERT INTO sgs_pro_propuesta_linea (actividad, longitud_m, longitud_km, id_propuesta, geom)
SELECT
    src.actividad,
    src.long_m,
    src.long_km,
    seq.id_propuesta,
    src.geom
FROM seq_src src
JOIN seq ON seq.rn = src.rn;

COMMIT;

-- Reporte final
SELECT 'sgs_pre_predio total/con_geom' AS tabla, COUNT(*) AS registros, COUNT(geom) AS con_geom FROM sgs_pre_predio
UNION ALL SELECT 'sgs_inf_via', COUNT(*), COUNT(geom) FROM sgs_inf_via
UNION ALL SELECT 'sgs_inf_drenaje_simple', COUNT(*), COUNT(geom) FROM sgs_inf_drenaje_simple
UNION ALL SELECT 'sgs_inf_drenaje_doble', COUNT(*), COUNT(geom) FROM sgs_inf_drenaje_doble
UNION ALL SELECT 'sgs_pro_propuesta', COUNT(*), NULL FROM sgs_pro_propuesta
UNION ALL SELECT 'sgs_pro_propuesta_linea', COUNT(*), COUNT(geom) FROM sgs_pro_propuesta_linea
ORDER BY tabla;