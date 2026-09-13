-- =============================================================================
-- 36-indicadores-fuente-unica.sql
--
-- FUENTE ÚNICA DE VERDAD de los 10 indicadores del convenio CAR-WWF-Natura.
--
-- Problema que resuelve (FINAL-CLOSURE-PLAN, mejora #1):
--   Los patrones de fuzzy-match (unaccent + ILIKE sobre `actividad`) estaban
--   duplicados en 4+ lugares: getC1A1..getC2A2, getDetalleMunicipio,
--   INDICADORES_META.patterns (drill-down) y scripts/audit_resultados.mjs.
--   Eso permitía que el global, el drill-down municipal y la reconciliación
--   divergieran sin que nadie lo notara.
--
-- Solución:
--   Una vista `sgs_v_indicador_propuesta` que mapea cada propuesta (o cada
--   fila hija) al/los indicadores a los que contribuye, con su medida.
--   Todo lo demás (global, por municipio, drill-down) se deriva de acá:
--
--     sgs_v_indicador_propuesta        (detalle: 1 fila por indicador+propuesta)
--       └─► sgs_v_indicador_global     (agregado: 1 fila por indicador)
--
--   Cambiar un patrón = editar SOLO este archivo.
--
-- Contrato de columnas:
--   indicador_key  text     clave estable (coincide con IndicadorKey en TS)
--   id_propuesta   integer  propuesta súper asociada
--   id_predio      integer  predio asociado (nullable; fuente para COUNT DISTINCT)
--   medida         numeric  km (líneas) | ha (polígonos) | 1 (puntos)
--   unidad         text     'km' | 'ha' | 'obras' | 'kits' | 'estaciones' | 'predios'
--   agregacion     text     'sum' | 'count_distinct_predio'
--   actividad      text     texto original (para mostrar en drill-down)
--
-- Nota: `sgs_v_metas_*` (migraciones 12/13) quedan DEPRECADAS. Alimentaban la
-- página `/metas`, que ahora redirige a `/metas/convenio`. No se dropean para
-- no romper prod_smoke ni consumidores externos; ver DEEPSEEK-COORDINATION.md.
-- =============================================================================

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
  AND unaccent(pl.actividad) ILIKE unaccent('%alambre%')

UNION ALL
SELECT 'multiestrat', pl.id_propuesta, pp.id_predio, pl.longitud_km, 'km', 'sum', pl.actividad
FROM sgs_pro_propuesta_linea pl
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pl.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A1'
  AND unaccent(pl.actividad) ILIKE unaccent('%multiestrat%')

-- ===========================================================================
-- C1A2 — Conectividad (líneas) + silvopastoriles/agroforestales (polígonos)
-- ===========================================================================
UNION ALL
SELECT 'conectividad', pl.id_propuesta, pp.id_predio, pl.longitud_km, 'km', 'sum', pl.actividad
FROM sgs_pro_propuesta_linea pl
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pl.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  AND (unaccent(pl.actividad) ILIKE unaccent('%franja%conectividad%')
    OR unaccent(pl.actividad) ILIKE unaccent('%conectividad%'))

UNION ALL
SELECT 'silvopastoril', pq.id_propuesta, pp.id_predio, pq.area_ha, 'ha', 'sum', pq.actividad
FROM sgs_pro_propuesta_poligono pq
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pq.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  AND (unaccent(pq.actividad) ILIKE unaccent('%silvopastoril%')
    OR unaccent(pq.actividad) ILIKE unaccent('%silvopast%')
    OR unaccent(pq.actividad) ILIKE unaccent('%pastos arbolados%')
    OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%pastos%')
    OR unaccent(pq.actividad) ILIKE unaccent('%enriquecimiento%arbol%dispers%')
    OR unaccent(pq.actividad) ILIKE unaccent('%arboles dispersos%')
    OR unaccent(pq.actividad) ILIKE unaccent('%rastrojo%')
    OR unaccent(pq.actividad) ILIKE unaccent('%pradera%')
    OR unaccent(pq.actividad) ILIKE unaccent('%potrero%')
    OR unaccent(pq.actividad) ILIKE unaccent('%ssp%'))

UNION ALL
SELECT 'agroforestal', pq.id_propuesta, pp.id_predio, pq.area_ha, 'ha', 'sum', pq.actividad
FROM sgs_pro_propuesta_poligono pq
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pq.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  AND (unaccent(pq.actividad) ILIKE unaccent('%agroforestal%')
    OR unaccent(pq.actividad) ILIKE unaccent('%bosque%comestible%')
    OR unaccent(pq.actividad) ILIKE unaccent('%modulo%alta densidad%')
    OR unaccent(pq.actividad) ILIKE unaccent('%modulo%')
    OR unaccent(pq.actividad) ILIKE unaccent('%banco%proteina%')
    OR unaccent(pq.actividad) ILIKE unaccent('%banco%')
    OR unaccent(pq.actividad) ILIKE unaccent('%huerta%')
    OR unaccent(pq.actividad) ILIKE unaccent('%callejon%'))

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
  AND unaccent(pt.actividad) ILIKE unaccent('%cosecha%')

UNION ALL
SELECT 'compostaje', pt.id_propuesta, pp.id_predio, 1::numeric, 'kits', 'sum', pt.actividad
FROM sgs_pro_propuesta_punto pt
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pt.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C2' AND a.nombre = 'A1'
  AND (unaccent(pt.actividad) ILIKE unaccent('%compostaje%')
    OR unaccent(pt.actividad) ILIKE unaccent('%compost%'))

-- ===========================================================================
-- C2A2 — Estaciones + obras de captación (puntos)
--   SIN filtro de componente/acción: el spec dice "sumar todas las similares"
--   (C2A2 + C3A1). Ver P1-4 del FINAL-CLOSURE-PLAN.
-- ===========================================================================
UNION ALL
SELECT 'estaciones', pt.id_propuesta, pp.id_predio, 1::numeric, 'estaciones', 'sum', pt.actividad
FROM sgs_pro_propuesta_punto pt
JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
WHERE unaccent(pt.actividad) ILIKE unaccent('%estacion%limnimet%')
   OR unaccent(pt.actividad) ILIKE unaccent('%limnimet%')

UNION ALL
SELECT 'obras_captacion', pt.id_propuesta, pp.id_predio, 1::numeric, 'obras', 'sum', pt.actividad
FROM sgs_pro_propuesta_punto pt
JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
WHERE unaccent(pt.actividad) ILIKE unaccent('%captacion%')
   OR unaccent(pt.actividad) ILIKE unaccent('%captaci%')

-- ===========================================================================
-- C3 — Predios intervenidos en áreas protegidas
--   Agregación = COUNT(DISTINCT id_predio), no SUM(medida).
-- ===========================================================================
UNION ALL
SELECT 'predios_c3', pp.id_propuesta, pp.id_predio, 1::numeric, 'predios', 'count_distinct_predio', pp.tipo
FROM sgs_pro_propuesta pp
JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c ON c.id_componente = a.id_componente
WHERE c.nombre = 'C3' AND pp.id_predio IS NOT NULL;

COMMENT ON VIEW sgs_v_indicador_propuesta IS
  'Fuente única de verdad: mapea cada propuesta/fila al indicador del convenio '
  'y su medida. Global, municipio y drill-down se derivan de acá. '
  'Cambiar un patrón de actividad = editar SOLO esta vista.';

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
