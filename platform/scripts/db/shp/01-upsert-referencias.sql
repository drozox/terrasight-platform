-- =============================================================================
-- Shapefile -> Tablas target: UPSERT con geometría
-- Estrategia: agregar shapes como datos extra; matchear por atributo donde sea posible.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. MIGRACIÓN: agregar columna geom a tablas ambientales que la necesitan
-- ---------------------------------------------------------------------------
ALTER TABLE sgs_amb_bioma            ADD COLUMN IF NOT EXISTS geom GEOMETRY(MULTIPOLYGON, 4686);
ALTER TABLE sgs_amb_cobertura_clc   ADD COLUMN IF NOT EXISTS geom GEOMETRY(MULTIPOLYGON, 4686);
ALTER TABLE sgs_amb_zonificacion_pomca ADD COLUMN IF NOT EXISTS geom GEOMETRY(MULTIPOLYGON, 4686);
ALTER TABLE sgs_amb_zonificacion_rfp   ADD COLUMN IF NOT EXISTS geom GEOMETRY(MULTIPOLYGON, 4686);
ALTER TABLE sgs_amb_paramos            ADD COLUMN IF NOT EXISTS geom GEOMETRY(MULTIPOLYGON, 4686);
CREATE INDEX IF NOT EXISTS idx_sgs_amb_bioma_geom            ON sgs_amb_bioma USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_sgs_amb_cobertura_geom        ON sgs_amb_cobertura_clc USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_sgs_amb_zon_pomca_geom        ON sgs_amb_zonificacion_pomca USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_sgs_amb_zon_rfp_geom          ON sgs_amb_zonificacion_rfp USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_sgs_amb_paramos_geom          ON sgs_amb_paramos USING GIST (geom);

-- ---------------------------------------------------------------------------
-- 1. MUNICIPIOS (3 records del shape: La Calera, San Cayetano, Susa)
-- ---------------------------------------------------------------------------
-- INSERT los que NO existen (por código DANE), con id_municipio nuevo
INSERT INTO bcs_lpa_municipio (nombre_municipio, codigo_administrativo, departamento, geom)
SELECT
    TRIM(s.mpio_cnmbr) AS nombre,
    TRIM(s.mpio_cdpmp) AS codigo,
    TRIM(s.dpto_cnmbr) AS departamento,
    s.geom
FROM public.stg_municipio s
WHERE NOT EXISTS (
    SELECT 1 FROM bcs_lpa_municipio m
    WHERE m.nombre_municipio = TRIM(s.mpio_cnmbr)
       OR m.codigo_administrativo = TRIM(s.mpio_cdpmp)
);

-- UPDATE geom para los que ya existen (por nombre o código)
UPDATE bcs_lpa_municipio m
SET geom = s.geom
FROM public.stg_municipio s
WHERE (m.nombre_municipio = TRIM(s.mpio_cnmbr)
       OR m.codigo_administrativo = TRIM(s.mpio_cdpmp))
  AND m.geom IS NULL;

-- ---------------------------------------------------------------------------
-- 2. VEREDAS (23 records)
-- Match por nombre + municipio (codigo_mun del shape -> codigo_administrativo del municipio)
-- ---------------------------------------------------------------------------
INSERT INTO bcs_lpa_vereda (nombre_vereda, codigo_administrativo, poblacion_estimada, id_municipio, geom)
SELECT
    TRIM(s.nombre) AS nombre,
    COALESCE(TRIM(s.cod_vereda), 'S/C') AS codigo,
    0 AS poblacion,
    m.id_municipio,
    s.geom
FROM public.stg_vereda s
JOIN bcs_lpa_municipio m
  ON m.codigo_administrativo = TRIM(s.codigo_mun)
  OR m.nombre_municipio = TRIM(s.municipio)
ON CONFLICT DO NOTHING;

UPDATE bcs_lpa_vereda v
SET geom = s.geom
FROM public.stg_vereda s,
     bcs_lpa_municipio m
WHERE v.id_municipio = m.id_municipio
  AND v.nombre_vereda = TRIM(s.nombre)
  AND (m.codigo_administrativo = TRIM(s.codigo_mun)
       OR m.nombre_municipio = TRIM(s.municipio))
  AND v.geom IS NULL;

-- ---------------------------------------------------------------------------
-- 3. BIOMAS (70 records)
-- Match por nombre exacto (bioma_iavh del seed ↔ bioma_IAvH del shape)
-- ---------------------------------------------------------------------------
INSERT INTO sgs_amb_bioma (bioma_iavh, area_ha, area_m2, geom)
SELECT
    TRIM(s.bioma_IAvH) AS bioma,
    COALESCE(s.area_ha, 0)::decimal(12,2),
    COALESCE(s.area_ha, 0)::decimal(12,2) * 10000 AS area_m2,
    s.geom
FROM public.stg_bioma s
WHERE s.bioma_IAvH IS NOT NULL
  AND TRIM(s.bioma_IAvH) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM sgs_amb_bioma b
    WHERE b.bioma_iavh = TRIM(s.bioma_IAvH)
);

UPDATE sgs_amb_bioma b
SET geom = s.geom,
    area_ha = COALESCE(NULLIF(s.area_ha, 0), b.area_ha),
    area_m2 = COALESCE(NULLIF(s.area_ha, 0), b.area_ha) * 10000
FROM public.stg_bioma s
WHERE b.bioma_iavh = TRIM(s.bioma_IAvH)
  AND b.geom IS NULL;

-- ---------------------------------------------------------------------------
-- 4. COBERTURA CLC (35 records)
-- Match por código CLC (label del shape ↔ codigo_clc_nivel3 del seed)
-- ---------------------------------------------------------------------------
INSERT INTO sgs_amb_cobertura_clc (
    codigo_clc_nivel3, nombre_cobertura, area_ha, area_m2,
    estado_naturalidad, año_interpretacion, label, geom
)
SELECT
    TRIM(s.label) AS codigo_clc,
    TRIM(s.nombre) AS nombre,
    COALESCE(s.areaha, 0)::decimal(12,2) AS area_ha,
    COALESCE(s.areaha, 0)::decimal(12,2) * 10000 AS area_m2,
    CASE LOWER(TRIM(s.Naturalida))
        WHEN 'natural' THEN 'natural'
        WHEN 'seminatural' THEN 'seminatural'
        ELSE 'transformado'
    END AS estado,
    2023 AS año,
    TRIM(s.nombre) AS label,
    s.geom
FROM public.stg_cobertura s
WHERE s.label IS NOT NULL
  AND TRIM(s.label) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM sgs_amb_cobertura_clc c
    WHERE c.codigo_clc_nivel3 = TRIM(s.label)
);

UPDATE sgs_amb_cobertura_clc c
SET geom = s.geom,
    area_ha = COALESCE(NULLIF(s.areaha, 0), c.area_ha),
    area_m2 = COALESCE(NULLIF(s.areaha, 0), c.area_ha) * 10000,
    estado_naturalidad = CASE LOWER(TRIM(s.Naturalida))
        WHEN 'natural' THEN 'natural'
        WHEN 'seminatural' THEN 'seminatural'
        ELSE c.estado_naturalidad
    END
FROM public.stg_cobertura s
WHERE c.codigo_clc_nivel3 = TRIM(s.label)
  AND c.geom IS NULL;

COMMIT;

-- Reporte
SELECT 'bcs_lpa_municipio total' AS tabla, COUNT(*) AS registros,
       COUNT(geom) AS con_geom
FROM bcs_lpa_municipio
UNION ALL
SELECT 'bcs_lpa_vereda', COUNT(*), COUNT(geom) FROM bcs_lpa_vereda
UNION ALL
SELECT 'sgs_amb_bioma', COUNT(*), COUNT(geom) FROM sgs_amb_bioma
UNION ALL
SELECT 'sgs_amb_cobertura_clc', COUNT(*), COUNT(geom) FROM sgs_amb_cobertura_clc
ORDER BY tabla;