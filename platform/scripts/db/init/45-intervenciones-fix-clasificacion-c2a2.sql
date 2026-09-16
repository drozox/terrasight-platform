-- =============================================================================
-- 45-intervenciones-fix-clasificacion-c2a2.sql
--
-- ERROR 3 (INTERVENCIONES): "Estación limnimétrica" y "Obras de captación"
-- estaban clasificadas en C3 (Componente 3) cuando corresponden ÚNICAMENTE a
-- C2A2 (Componente 2 - Acción 2). Las "Cosecha de agua" ya están bien en C2A1.
--
-- Verificado en la BD:
--   C3/A1 con actividades a mover: 2 registros
--     #7  [punto] "Estación limnimétrica"
--     #8  [punto] "Obras de captación"
--   (No se toca "Manguera captacion de agua" — es una línea distinta.)
--
-- Efecto sobre las metas: C2A2 pasa a 7 estaciones / 96 obras (antes 6/95
-- contando C2A2 y sumando C3). Se quita el `OR c.nombre='C3'` de la vista de
-- metas para que estaciones/obras sean SOLO C2A2.
-- =============================================================================

-- 1) Reclasificar a C2A2 las estaciones/obras que quedaron en C3.
UPDATE sgs_pro_propuesta pp
SET    id_accion = (
         SELECT a.id_accion
         FROM   sgs_com_accion a
         JOIN   sgs_com_componente c ON c.id_componente = a.id_componente
         WHERE  c.nombre = 'C2' AND a.nombre = 'A2'
         LIMIT  1
       )
WHERE  pp.id_accion IN (
         SELECT a.id_accion
         FROM   sgs_com_accion a
         JOIN   sgs_com_componente c ON c.id_componente = a.id_componente
         WHERE  c.nombre = 'C3'
       )
  AND  btrim(pp.actividad) IN ('Estación limnimétrica', 'Obras de captación');

-- 2) Redefinir la vista de metas: C2A2 sin la rama C3 (ya reclasificados).
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

UNION ALL
SELECT 'obras_captacion', pt.id_propuesta, pp.id_predio, 1::numeric, 'obras', 'sum', pt.actividad
FROM sgs_pro_propuesta_punto pt
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pt.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C2' AND a.nombre = 'A2'
  AND (unaccent(pt.actividad) ILIKE unaccent('%captacion%') OR unaccent(pt.actividad) ILIKE unaccent('%obras%captacion%'))

UNION ALL
SELECT 'predios_c3', pp.id_propuesta, pp.id_predio, 1::numeric, 'predios', 'count_distinct_predio', pp.tipo
FROM sgs_pro_propuesta pp
JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c ON c.id_componente = a.id_componente
WHERE c.nombre = 'C3' AND a.nombre IN ('U', 'A1') AND pp.id_predio IS NOT NULL;

COMMENT ON VIEW sgs_v_indicador_propuesta IS
  'Fuente única de los 10 indicadores. C1A2 por Actividad (mig.44). C2A2 estaciones/obras SOLO C2A2 (mig.45).';

CREATE OR REPLACE VIEW sgs_v_indicador_global AS
SELECT indicador_key, unidad,
       CASE WHEN max(agregacion) = 'count_distinct_predio'
              THEN count(DISTINCT id_predio)::numeric
            ELSE COALESCE(SUM(medida), 0)::numeric END AS actual
FROM sgs_v_indicador_propuesta
GROUP BY indicador_key, unidad;
