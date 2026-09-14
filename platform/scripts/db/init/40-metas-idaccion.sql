-- =============================================================================
-- 40-metas-idaccion.sql — DEEPSEEK-F4
--
-- Reemplaza la fuente única (migración 36) por una basada en id_accion
-- (no fuzzy-match sobre actividad). Cambia la forma de calcular los 10
-- indicadores del convenio CAR-WWF-Fundación Natura:
--
--   C1A1 (C1+A1) — Propuestas_línea:
--     - cercos_vivos:      actividad LIKE '%cerco vivo%' OR '%cerca viva%'
--     - alambre:           actividad LIKE '%alambre%' OR '%aislamiento%'
--
--   C1A2 (C1+A2) — Propuestas_polígono:
--     - conectividad:      actividad LIKE '%conectividad%' OR '%franja conectividad%' OR '%crb%'
--     - silvopastoril:     actividad LIKE '%silvopastoril%' OR '%ssp%'
--     - agroforestal:      actividad LIKE '%agroforestal%' OR '%saf%'
--
--   C2A1 (C2+A1) — Propuestas_punto:
--     - cosecha:           actividad = 'Cosecha de agua'
--     - compostaje:        actividad = 'Kit de compostaje'
--
--   C2A2 (C2+A2) — Propuestas_punto (TODAS las de C2, ver P1-4):
--     - estaciones:        actividad LIKE '%estacion%limnimet%'
--     - obras_captacion:   actividad LIKE '%captacion%' OR '%obras%captacion%'
--
--   C3 (C3) — Count distinct id_predio con propuestas en C3
--     - predios_c3
--
-- Comparado con la 36 (fuzzy), esta versión es MENOS permisiva pero más
-- consistente con el brief del user (F4): "filtrar por Id_Accion +
-- actividad específica". Los criterios fuzzy que tenía la 36 (%multiestrat%,
-- %pastos arbolados%, %rastrojo%, etc.) desaparecen — esos ahora requieren
-- que el equipo asigne explícitamente la actividad correcta.
--
-- Para evitar romper el drill-down en /metas/convenio que lee estas vistas,
-- conservamos los nombres de columnas (indicador_key, id_propuesta,
-- id_predio, medida, unidad, agregacion, actividad).
-- =============================================================================

DROP VIEW IF EXISTS sgs_v_indicador_global;
DROP VIEW IF EXISTS sgs_v_indicador_propuesta;

-- -----------------------------------------------------------------------------
-- Detalle: 1 fila por indicador+propuesta (o fila hija).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW sgs_v_indicador_propuesta AS

-- ===========================================================================
-- C1A1 — Conservación del recurso hídrico (líneas)
-- ===========================================================================
SELECT 'cercos_vivos'::text AS indicador_key,
       pl.id_propuesta,
       pp.id_predio,
       pl.longitud_km::numeric AS medida,
       'km'::text  AS unidad,
       'sum'::text AS agregacion,
       pl.actividad
FROM sgs_pro_propuesta_linea pl
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pl.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A1'
  AND (unaccent(pl.actividad) ILIKE unaccent('%cerco vivo%')
    OR unaccent(pl.actividad) ILIKE unaccent('%cerca viva%'))

UNION ALL
SELECT 'alambre', pl.id_propuesta, pp.id_predio, pl.longitud_km, 'km', 'sum', pl.actividad
FROM sgs_pro_propuesta_linea pl
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pl.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A1'
  AND (unaccent(pl.actividad) ILIKE unaccent('%alambre%')
    OR unaccent(pl.actividad) ILIKE unaccent('%aislamiento%'))

-- ===========================================================================
-- C1A2 — Conectividad / silvopastoril / agroforestal (polígonos)
-- ===========================================================================
UNION ALL
SELECT 'conectividad', pq.id_propuesta, pp.id_predio, pq.area_ha, 'ha', 'sum', pq.actividad
FROM sgs_pro_propuesta_poligono pq
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pq.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  AND (unaccent(pq.actividad) ILIKE unaccent('%conectividad%')
    OR unaccent(pq.actividad) ILIKE unaccent('%crb%'))

UNION ALL
SELECT 'silvopastoril', pq.id_propuesta, pp.id_predio, pq.area_ha, 'ha', 'sum', pq.actividad
FROM sgs_pro_propuesta_poligono pq
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pq.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  AND (unaccent(pq.actividad) ILIKE unaccent('%silvopastoril%')
    OR unaccent(pq.actividad) ILIKE unaccent('%ssp%'))

UNION ALL
SELECT 'agroforestal', pq.id_propuesta, pp.id_predio, pq.area_ha, 'ha', 'sum', pq.actividad
FROM sgs_pro_propuesta_poligono pq
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pq.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  AND (unaccent(pq.actividad) ILIKE unaccent('%agroforestal%')
    OR unaccent(pq.actividad) ILIKE unaccent('%saf%'))

-- ===========================================================================
-- C2A1 — Cosecha de agua + compostaje (puntos)
-- ===========================================================================
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
  AND (unaccent(pt.actividad) ILIKE unaccent('%compostaje%')
    OR unaccent(pt.actividad) ILIKE unaccent('%kit%compost%'))

-- ===========================================================================
-- C2A2 — Estaciones + obras de captación (puntos)
--   El spec del user (F4) dice "sumar TODAS las similares (C2A2 + C3)"
--   porque cada municipio tiene 1 CxAy. Mantenemos ese criterio.
-- ===========================================================================
UNION ALL
SELECT 'estaciones', pt.id_propuesta, pp.id_predio, 1::numeric, 'estaciones', 'sum', pt.actividad
FROM sgs_pro_propuesta_punto pt
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pt.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE (c.nombre = 'C2' AND a.nombre = 'A2') OR (c.nombre = 'C3')
  AND unaccent(pt.actividad) ILIKE unaccent('%estacion%limnimet%')

UNION ALL
SELECT 'obras_captacion', pt.id_propuesta, pp.id_predio, 1::numeric, 'obras', 'sum', pt.actividad
FROM sgs_pro_propuesta_punto pt
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pt.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE (c.nombre = 'C2' AND a.nombre = 'A2') OR (c.nombre = 'C3')
  AND (unaccent(pt.actividad) ILIKE unaccent('%captacion%')
    OR unaccent(pt.actividad) ILIKE unaccent('%obras%captacion%'))

-- ===========================================================================
-- C3AU — Predios intervenidos en áreas protegidas
--   Filtro explícito por acción U (requiere migración 41 que crea la fila
--   "U" en sgs_com_accion para C3). Antes filtrábamos solo por `c.nombre='C3'`
--   lo que era incorrecto si C3 tuviera más acciones.
--   Agregación = COUNT(DISTINCT id_predio), no SUM(medida).
-- ===========================================================================
UNION ALL
SELECT 'predios_c3', pp.id_propuesta, pp.id_predio, 1::numeric, 'predios', 'count_distinct_predio', pp.tipo
FROM sgs_pro_propuesta pp
JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c ON c.id_componente = a.id_componente
WHERE c.nombre = 'C3' AND a.nombre = 'U' AND pp.id_predio IS NOT NULL;

COMMENT ON VIEW sgs_v_indicador_propuesta IS
  'Fuente única de verdad (DEEPSEEK-F4). Mapea cada propuesta/fila al '
  'indicador del convenio usando id_accion + actividad específica. '
  'Cambiar un patrón = editar SOLO esta vista (migración 40).';

-- -----------------------------------------------------------------------------
-- Agregado global: 1 fila por indicador.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW sgs_v_indicador_global AS
SELECT indicador_key,
       unidad,
       CASE
         WHEN max(agregacion) = 'count_distinct_predio'
           THEN count(DISTINCT id_predio)::numeric
         ELSE COALESCE(SUM(medida), 0)::numeric
       END AS actual
FROM sgs_v_indicador_propuesta
GROUP BY indicador_key, unidad;

COMMENT ON VIEW sgs_v_indicador_global IS
  'Agregado de sgs_v_indicador_propuesta. 1 fila por indicador (actual + unidad). '
  'Consumida por getMetasConvenio() y audit_resultados.mjs.';
