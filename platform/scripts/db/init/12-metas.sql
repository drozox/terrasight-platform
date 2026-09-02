-- =============================================================================
-- S5.M — Módulo de Metas por Componente/Acción
--
-- Genera dos vistas que alimentan la página /metas del frontend:
--
--   sgs_v_metas_resumen
--     Una fila por cada meta del convenio (9 metas en MVP: C1A1 ×2, C1A2 ×3,
--     C2A1 ×2, C2A2 ×2). El frontend no necesita conocer la lógica de
--     agregación: cada fila ya trae `current_value` y `meta_value` listos
--     para mostrar el % de avance.
--
--   sgs_v_municipios_intervenidos
--     Un municipio por fila con conteos de propuestas, predios y veredas
--     que tienen al menos una propuesta asociada. Permite responder la
--     pregunta "¿cuáles municipios han sido intervenidos?".
--
-- Convenciones:
--   - El matching de actividad es case-insensitive (ILIKE) para tolerar
--     variaciones de cómo se cargan los datos desde la GDB del convenio
--     (ver tesis F03). Si un día se decide un catálogo cerrado de
--     actividades, se reemplaza ILIKE por una FK.
--   - Las metas están hardcoded en el SQL (12 km, 15 ha, 79 unidades, etc.).
--     Si en el futuro se quiere editar desde la UI, se migra a una tabla
--     `sgs_ind_meta` con CRUD admin (HU pendiente).
--   - C3 NO está incluido en esta vista porque la BD no tiene acciones
--     C3A1/C3A2 (TODO migracion 13). Cuando se agreguen, agregar 1 fila
--     "C3 / 35 predios en áreas protegidas" usando:
--       COUNT(DISTINCT pr.id_predio) WHERE comp='C3' AND (en RFP o Páramos)
--
-- Requisitos:
--   - Migraciones previas aplicadas (01..11).
--   - Tablas sgs_pro_propuesta / sgs_pro_propuesta_linea /
--     sgs_pro_propuesta_poligono / sgs_pro_propuesta_punto pobladas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Vista 1: sgs_v_metas_resumen
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW sgs_v_metas_resumen AS
WITH
-- ============ C1A1: Conservación del recurso hídrico ============
c1a1_cercos_vivos AS (
    SELECT
        'C1'::text                 AS componente,
        'A1'::text                 AS accion,
        'c1a1_cercos_vivos'::text  AS meta_key,
        'Cercos vivos'::text       AS meta_label,
        12.0                       AS meta_value,
        'km'::text                 AS meta_unit,
        COALESCE(SUM(pl.longitud_km), 0)::numeric AS current_value,
        'km'::text                 AS current_unit,
        COUNT(*)                   AS count_propuestas
    FROM sgs_pro_propuesta_linea pl
    JOIN sgs_pro_propuesta    pp ON pl.id_propuesta = pp.id_propuesta
    JOIN sgs_com_accion       a  ON pp.id_accion   = a.id_accion
    JOIN sgs_com_componente   c  ON a.id_componente = c.id_componente
    WHERE c.nombre = 'C1' AND a.nombre = 'A1'
      AND pl.actividad ILIKE '%cerca viva%'
),
c1a1_aislamiento AS (
    SELECT
        'C1'::text,
        'A1'::text,
        'c1a1_aislamiento'::text,
        'Aislamientos (cerco de alambre)'::text,
        12.0,
        'km'::text,
        COALESCE(SUM(pl.longitud_km), 0)::numeric,
        'km'::text,
        COUNT(*)
    FROM sgs_pro_propuesta_linea pl
    JOIN sgs_pro_propuesta    pp ON pl.id_propuesta = pp.id_propuesta
    JOIN sgs_com_accion       a  ON pp.id_accion   = a.id_accion
    JOIN sgs_com_componente   c  ON a.id_componente = c.id_componente
    WHERE c.nombre = 'C1' AND a.nombre = 'A1'
      AND (pl.actividad ILIKE '%aislamiento%' OR pl.actividad ILIKE '%cerco de alambre%')
),

-- ============ C1A2: 15 ha conectividad + 15 ha silvopastoril + 15 ha agroforestal ============
c1a2_conectividad AS (
    SELECT
        'C1'::text,
        'A2'::text,
        'c1a2_conectividad'::text,
        'Conectividad'::text,
        15.0,
        'ha'::text,
        COALESCE(SUM(pp2.area_ha), 0)::numeric,
        'ha'::text,
        COUNT(*)
    FROM sgs_pro_propuesta_poligono pp2
    JOIN sgs_pro_propuesta    pp ON pp2.id_propuesta = pp.id_propuesta
    JOIN sgs_com_accion       a  ON pp.id_accion    = a.id_accion
    JOIN sgs_com_componente   c  ON a.id_componente = c.id_componente
    WHERE c.nombre = 'C1' AND a.nombre = 'A2'
      AND pp2.actividad ILIKE '%conectividad%'
),
c1a2_silvopastoril AS (
    SELECT
        'C1'::text,
        'A2'::text,
        'c1a2_silvopastoril'::text,
        'Silvopastoriles'::text,
        15.0,
        'ha'::text,
        COALESCE(SUM(pp2.area_ha), 0)::numeric,
        'ha'::text,
        COUNT(*)
    FROM sgs_pro_propuesta_poligono pp2
    JOIN sgs_pro_propuesta    pp ON pp2.id_propuesta = pp.id_propuesta
    JOIN sgs_com_accion       a  ON pp.id_accion    = a.id_accion
    JOIN sgs_com_componente   c  ON a.id_componente = c.id_componente
    WHERE c.nombre = 'C1' AND a.nombre = 'A2'
      AND pp2.actividad ILIKE '%silvopastoril%'
),
c1a2_agroforestal AS (
    SELECT
        'C1'::text,
        'A2'::text,
        'c1a2_agroforestal'::text,
        'Agroforestales'::text,
        15.0,
        'ha'::text,
        COALESCE(SUM(pp2.area_ha), 0)::numeric,
        'ha'::text,
        COUNT(*)
    FROM sgs_pro_propuesta_poligono pp2
    JOIN sgs_pro_propuesta    pp ON pp2.id_propuesta = pp.id_propuesta
    JOIN sgs_com_accion       a  ON pp.id_accion    = a.id_accion
    JOIN sgs_com_componente   c  ON a.id_componente = c.id_componente
    WHERE c.nombre = 'C1' AND a.nombre = 'A2'
      AND pp2.actividad ILIKE '%agroforestal%'
),

-- ============ C2A1: 79 cosecha de agua + 79 kit compostaje ============
c2a1_cosecha AS (
    SELECT
        'C2'::text,
        'A1'::text,
        'c2a1_cosecha_agua'::text,
        'Cosecha de agua'::text,
        79.0,
        'unidades'::text,
        COUNT(*)::numeric,
        'unidades'::text,
        COUNT(*)
    FROM sgs_pro_propuesta_punto pp3
    JOIN sgs_pro_propuesta    pp ON pp3.id_propuesta = pp.id_propuesta
    JOIN sgs_com_accion       a  ON pp.id_accion    = a.id_accion
    JOIN sgs_com_componente   c  ON a.id_componente = c.id_componente
    WHERE c.nombre = 'C2' AND a.nombre = 'A1'
      AND pp3.actividad ILIKE '%cosecha%agua%'
),
c2a1_compostaje AS (
    SELECT
        'C2'::text,
        'A1'::text,
        'c2a1_compostaje'::text,
        'Kit de compostaje'::text,
        79.0,
        'unidades'::text,
        COUNT(*)::numeric,
        'unidades'::text,
        COUNT(*)
    FROM sgs_pro_propuesta_punto pp3
    JOIN sgs_pro_propuesta    pp ON pp3.id_propuesta = pp.id_propuesta
    JOIN sgs_com_accion       a  ON pp.id_accion    = a.id_accion
    JOIN sgs_com_componente   c  ON a.id_componente = c.id_componente
    WHERE c.nombre = 'C2' AND a.nombre = 'A1'
      AND pp3.actividad ILIKE '%compostaje%'
),

-- ============ C2A2: 7 estaciones limnimétricas + 48 obras de captación ============
c2a2_estaciones AS (
    SELECT
        'C2'::text,
        'A2'::text,
        'c2a2_estaciones_limnimetricas'::text,
        'Estaciones limnimétricas'::text,
        7.0,
        'unidades'::text,
        COUNT(*)::numeric,
        'unidades'::text,
        COUNT(*)
    FROM sgs_pro_propuesta_punto pp3
    JOIN sgs_pro_propuesta    pp ON pp3.id_propuesta = pp.id_propuesta
    JOIN sgs_com_accion       a  ON pp.id_accion    = a.id_accion
    JOIN sgs_com_componente   c  ON a.id_componente = c.id_componente
    WHERE c.nombre = 'C2' AND a.nombre = 'A2'
      AND (pp3.tipo_punto = 'estacion_limnimetrica' OR pp3.actividad ILIKE '%estaci%n limnimétric%')
),
c2a2_obras AS (
    SELECT
        'C2'::text,
        'A2'::text,
        'c2a2_obras_captacion'::text,
        'Obras de captación'::text,
        48.0,
        'unidades'::text,
        COUNT(*)::numeric,
        'unidades'::text,
        COUNT(*)
    FROM sgs_pro_propuesta_punto pp3
    JOIN sgs_pro_propuesta    pp ON pp3.id_propuesta = pp.id_propuesta
    JOIN sgs_com_accion       a  ON pp.id_accion    = a.id_accion
    JOIN sgs_com_componente   c  ON a.id_componente = c.id_componente
    WHERE c.nombre = 'C2' AND a.nombre = 'A2'
      AND (pp3.tipo_punto = 'obra_captacion' OR pp3.actividad ILIKE '%obra%captaci%n%')
)
SELECT * FROM c1a1_cercos_vivos
UNION ALL SELECT * FROM c1a1_aislamiento
UNION ALL SELECT * FROM c1a2_conectividad
UNION ALL SELECT * FROM c1a2_silvopastoril
UNION ALL SELECT * FROM c1a2_agroforestal
UNION ALL SELECT * FROM c2a1_cosecha
UNION ALL SELECT * FROM c2a1_compostaje
UNION ALL SELECT * FROM c2a2_estaciones
UNION ALL SELECT * FROM c2a2_obras;

COMMENT ON VIEW sgs_v_metas_resumen IS
    'Metas del convenio (HU-CO-?). Una fila por meta con current_value vs meta_value. '
    'C3 / 35 predios en áreas protegidas NO incluido: requiere acciones C3A1/A2 (migración 13).';

-- -----------------------------------------------------------------------------
-- Vista 2: sgs_v_municipios_intervenidos
--   "Cuántos municipios han sido intervenidos y cuáles son, qué veredas".
--   Cuenta propuestas, predios y veredas distintas por municipio.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW sgs_v_municipios_intervenidos AS
SELECT
    m.id_municipio,
    m.nombre_municipio,
    m.departamento,
    COUNT(DISTINCT pp.id_propuesta) AS num_propuestas,
    COUNT(DISTINCT pr.id_predio)    AS num_predios,
    COUNT(DISTINCT v.id_vereda)     AS num_veredas
FROM sgs_pro_propuesta pp
JOIN sgs_pre_predio    pr ON pp.id_predio  = pr.id_predio
JOIN bcs_lpa_vereda    v  ON pr.id_vereda  = v.id_vereda
JOIN bcs_lpa_municipio m  ON v.id_municipio = m.id_municipio
GROUP BY m.id_municipio, m.nombre_municipio, m.departamento
ORDER BY num_propuestas DESC, m.nombre_municipio;

COMMENT ON VIEW sgs_v_municipios_intervenidos IS
    'Municipios con al menos una propuesta asociada. Usado por /metas '
    'para responder "¿cuántos y cuáles municipios han sido intervenidos?".';

-- -----------------------------------------------------------------------------
-- Vista agregada para el hero de /metas: % global ponderado.
--   Devuelve: total_metas, metas_cumplidas (>=100%), total_current, total_meta
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW sgs_v_metas_resumen_global AS
SELECT
    COUNT(*)::int                                           AS total_metas,
    COUNT(*) FILTER (WHERE current_value >= meta_value)::int AS metas_cumplidas,
    SUM(current_value)::numeric                             AS sum_current,
    SUM(meta_value)::numeric                                AS sum_meta
FROM sgs_v_metas_resumen;

COMMENT ON VIEW sgs_v_metas_resumen_global IS
    'Agregación de sgs_v_metas_resumen para el hero de /metas.';
