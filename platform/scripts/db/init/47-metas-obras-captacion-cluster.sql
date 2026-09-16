-- =============================================================================
-- 47-metas-obras-captacion-cluster.sql
--
-- ERROR 2 (METAS): la meta de "Obras de captación" (C2A2) contaba 96 puntos,
-- pero hay obras duplicadas a <=50 m. Se agrupan los puntos a 50 m
-- (ST_ClusterDBSCAN en UTM 18N, metros) y se cuenta UNO por cluster.
--   Verificado: 96 puntos → 41 clusters a 50 m.
--
-- ERROR 3 (METAS): renombrar la actividad de línea "Franja de Conectividad"
-- → "Conectividad de Relictos Boscosos" (en sgs_pro_propuesta y su hija).
--
-- NOTA: los puntos tienen coordenadas lon/lat aunque estén marcados SRID 4686;
-- por eso se re-marca con ST_SetSRID(...,4326) antes de proyectar a UTM 18N.
--
-- Recrea ambas vistas (global depende de propuesta → hay que dropear global
-- primero). El global retoma la lista fija de 10 keys (migración 46).
-- =============================================================================

-- 1) Renombrar la actividad de línea.
UPDATE sgs_pro_propuesta
SET    actividad = 'Conectividad de Relictos Boscosos'
WHERE  actividad = 'Franja de Conectividad';

UPDATE sgs_pro_propuesta_linea
SET    actividad = 'Conectividad de Relictos Boscosos'
WHERE  actividad = 'Franja de Conectividad';

-- 2) Recrear vistas.
DROP VIEW IF EXISTS sgs_v_indicador_global;
DROP VIEW IF EXISTS sgs_v_indicador_propuesta;

CREATE OR REPLACE VIEW sgs_v_indicador_propuesta AS
SELECT 'cercos_vivos'::text AS indicador_key, pl.id_propuesta, pp.id_predio,
       pl.longitud_km::numeric AS medida, 'km'::text AS unidad, 'sum'::text AS agregacion, pl.actividad
FROM sgs_pro_propuesta_linea pl
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pl.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A1'
  AND (unaccent(pl.actividad) ILIKE unaccent('%cerco vivo%') OR unaccent(pl.actividad) ILIKE unaccent('%cerca viva%'))

UNION ALL
SELECT 'alambre', pl.id_propuesta, pp.id_predio, pl.longitud_km, 'km', 'sum', pl.actividad
FROM sgs_pro_propuesta_linea pl
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pl.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A1'
  AND (unaccent(pl.actividad) ILIKE unaccent('%alambre%') OR unaccent(pl.actividad) ILIKE unaccent('%aislamiento%'))

UNION ALL
SELECT 'conectividad', pq.id_propuesta, pp.id_predio, pq.area_ha::numeric, 'ha', 'sum', pq.actividad
FROM sgs_pro_propuesta_poligono pq
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pq.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  AND btrim(pq.actividad) IN ('Enriquecimiento - Pastos arbolados', 'Modulos de alta densidad', 'Enriquecimiento - Rastrojos')

UNION ALL
SELECT 'silvopastoril', pq.id_propuesta, pp.id_predio, pq.area_ha::numeric, 'ha', 'sum', pq.actividad
FROM sgs_pro_propuesta_poligono pq
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pq.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  AND btrim(pq.actividad) IN ('Enriquecimiento - Arboles dispersos', 'Banco de proteína')

UNION ALL
SELECT 'agroforestal', pq.id_propuesta, pp.id_predio, pq.area_ha::numeric, 'ha', 'sum', pq.actividad
FROM sgs_pro_propuesta_poligono pq
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pq.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  AND btrim(pq.actividad) = 'Bosques Comestibles'

UNION ALL
SELECT 'cosecha', pt.id_propuesta, pp.id_predio, 1::numeric, 'obras', 'sum', pt.actividad
FROM sgs_pro_propuesta_punto pt
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pt.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C2' AND a.nombre = 'A1'
  AND unaccent(pt.actividad) ILIKE unaccent('%cosecha%agua%')

UNION ALL
SELECT 'compostaje', pt.id_propuesta, pp.id_predio, 1::numeric, 'kits', 'sum', pt.actividad
FROM sgs_pro_propuesta_punto pt
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pt.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C2' AND a.nombre = 'A1'
  AND (unaccent(pt.actividad) ILIKE unaccent('%compostaje%') OR unaccent(pt.actividad) ILIKE unaccent('%kit%compost%'))

UNION ALL
SELECT 'estaciones', pt.id_propuesta, pp.id_predio, 1::numeric, 'estaciones', 'sum', pt.actividad
FROM sgs_pro_propuesta_punto pt
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pt.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C2' AND a.nombre = 'A2'
  AND unaccent(pt.actividad) ILIKE unaccent('%estacion%limnimet%')

-- Obras de captación: 1 fila por CLUSTER a <=50 m (no por punto).
UNION ALL
SELECT 'obras_captacion', u.id_propuesta, u.id_predio, 1::numeric, 'obras', 'sum', u.actividad
FROM (
  SELECT DISTINCT ON (cl.cid) cl.id_propuesta, cl.id_predio, cl.actividad
  FROM (
    SELECT pt.id_propuesta, pp.id_predio, pt.actividad,
           ST_ClusterDBSCAN(
             ST_Transform(ST_SetSRID(pt.geom, 4326), 32618),
             eps := 50, minpoints := 1
           ) OVER () AS cid
    FROM sgs_pro_propuesta_punto pt
    JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pt.id_propuesta
    JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
    JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
    WHERE c.nombre = 'C2' AND a.nombre = 'A2' AND pt.geom IS NOT NULL
      AND (unaccent(pt.actividad) ILIKE unaccent('%captacion%')
        OR unaccent(pt.actividad) ILIKE unaccent('%obras%captacion%'))
  ) cl
  WHERE cl.cid IS NOT NULL
  ORDER BY cl.cid, cl.id_propuesta
) u

UNION ALL
SELECT 'predios_c3', pp.id_propuesta, pp.id_predio, 1::numeric, 'predios', 'count_distinct_predio', pp.tipo
FROM sgs_pro_propuesta pp
JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c ON c.id_componente = a.id_componente
WHERE c.nombre = 'C3' AND a.nombre IN ('U', 'A1') AND pp.id_predio IS NOT NULL;

-- 3) Global con las 10 keys siempre presentes (migración 46).
CREATE OR REPLACE VIEW sgs_v_indicador_global AS
WITH keys(indicador_key, unidad) AS (
  VALUES
    ('cercos_vivos'::text,    'km'::text),
    ('alambre',               'km'),
    ('conectividad',          'ha'),
    ('silvopastoril',         'ha'),
    ('agroforestal',          'ha'),
    ('cosecha',               'obras'),
    ('compostaje',            'kits'),
    ('estaciones',            'estaciones'),
    ('obras_captacion',       'obras'),
    ('predios_c3',            'predios')
),
agg AS (
  SELECT indicador_key,
         CASE
           WHEN max(agregacion) = 'count_distinct_predio'
             THEN count(DISTINCT id_predio)::numeric
           ELSE COALESCE(SUM(medida), 0)::numeric
         END AS actual
  FROM sgs_v_indicador_propuesta
  GROUP BY indicador_key
)
SELECT k.indicador_key, k.unidad, COALESCE(a.actual, 0)::numeric AS actual
FROM keys k
LEFT JOIN agg a ON a.indicador_key = k.indicador_key;
