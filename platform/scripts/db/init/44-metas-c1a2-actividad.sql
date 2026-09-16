-- =============================================================================
-- 44-metas-c1a2-actividad.sql — C1A2 por Actividad (agrupada en 3 arreglos)
--
-- El campo `tipo_arreg` NO existe en la BD (viene en el GDB pero el import lo
-- descartó). La clasificación de C1A2 se hace agrupando `Actividad` en 3 tipos
-- de arreglo. Reglas del negocio (spec Nikoll, exactas):
--
--   Silvopastoril: "Enriquecimiento - Arboles dispersos", "Banco de proteína"
--   Conectividad:  "Enriquecimiento - Pastos arbolados",
--                  "Modulos de alta densidad",
--                  "Enriquecimiento - Rastrojos"
--   Agroforestal:  "Bosques Comestibles"
--
-- Valores verificados (239 polígonos, 37 en C1A2):
--   Silvopastoril 5 → 1.48 ha · Conectividad 27 → 8.15 ha · Agroforestal 5 → 1.27 ha
--
-- IMPORTANTE: ahora las 3 metas de C1A2 son POLÍGONOS en HA (antes conectividad
-- se medía en líneas/km por un match fuzzy sobre "Franjas de Conectividad").
--
-- El resto de indicadores (C1A1, C2A1, C2A2, C3AU) queda igual que la 42.
-- =============================================================================

DROP VIEW IF EXISTS sgs_v_indicador_global;
DROP VIEW IF EXISTS sgs_v_indicador_propuesta;

CREATE OR REPLACE VIEW sgs_v_indicador_propuesta AS

-- ===========================================================================
-- C1A1 — Cercos vivos + aislamientos (líneas)
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
-- C1A2 — Conectividad / silvopastoril / agroforestal (POLÍGONOS, ha)
--   Clasificación por Actividad (match exacto). Reemplaza el match fuzzy por
--   actividad de la migración 42.
-- ===========================================================================
UNION ALL
-- conectividad
SELECT 'conectividad'::text AS indicador_key,
       pq.id_propuesta,
       pp.id_predio,
       pq.area_ha::numeric AS medida,
       'ha'::text  AS unidad,
       'sum'::text AS agregacion,
       pq.actividad
FROM sgs_pro_propuesta_poligono pq
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pq.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  AND btrim(pq.actividad) IN (
    'Enriquecimiento - Pastos arbolados',
    'Modulos de alta densidad',
    'Enriquecimiento - Rastrojos'
  )

UNION ALL
-- silvopastoril
SELECT 'silvopastoril'::text AS indicador_key,
       pq.id_propuesta,
       pp.id_predio,
       pq.area_ha::numeric AS medida,
       'ha'::text  AS unidad,
       'sum'::text AS agregacion,
       pq.actividad
FROM sgs_pro_propuesta_poligono pq
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pq.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  AND btrim(pq.actividad) IN (
    'Enriquecimiento - Arboles dispersos',
    'Banco de proteína'
  )

UNION ALL
-- agroforestal
SELECT 'agroforestal'::text AS indicador_key,
       pq.id_propuesta,
       pp.id_predio,
       pq.area_ha::numeric AS medida,
       'ha'::text  AS unidad,
       'sum'::text AS agregacion,
       pq.actividad
FROM sgs_pro_propuesta_poligono pq
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pq.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  AND btrim(pq.actividad) = 'Bosques Comestibles'

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
-- C2A2 — Estaciones + obras de captación (puntos, C2A2 + C3)
-- ===========================================================================
UNION ALL
SELECT 'estaciones', pt.id_propuesta, pp.id_predio, 1::numeric, 'estaciones', 'sum', pt.actividad
FROM sgs_pro_propuesta_punto pt
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pt.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE ((c.nombre = 'C2' AND a.nombre = 'A2') OR (c.nombre = 'C3'))
  AND unaccent(pt.actividad) ILIKE unaccent('%estacion%limnimet%')

UNION ALL
SELECT 'obras_captacion', pt.id_propuesta, pp.id_predio, 1::numeric, 'obras', 'sum', pt.actividad
FROM sgs_pro_propuesta_punto pt
JOIN sgs_pro_propuesta  pp ON pp.id_propuesta = pt.id_propuesta
JOIN sgs_com_accion     a  ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
WHERE ((c.nombre = 'C2' AND a.nombre = 'A2') OR (c.nombre = 'C3'))
  AND (unaccent(pt.actividad) ILIKE unaccent('%captacion%')
    OR unaccent(pt.actividad) ILIKE unaccent('%obras%captacion%'))

-- ===========================================================================
-- C3AU — Predios intervenidos en áreas protegidas
-- ===========================================================================
UNION ALL
SELECT 'predios_c3', pp.id_propuesta, pp.id_predio, 1::numeric, 'predios', 'count_distinct_predio', pp.tipo
FROM sgs_pro_propuesta pp
JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c ON c.id_componente = a.id_componente
WHERE c.nombre = 'C3' AND a.nombre IN ('U', 'A1') AND pp.id_predio IS NOT NULL;

COMMENT ON VIEW sgs_v_indicador_propuesta IS
  'Fuente única de verdad de los 10 indicadores del convenio. C1A2 se clasifica '
  'por Actividad (migración 44): Silvopastoril / Conectividad / Agroforestal. '
  'Cambiar un patrón = editar SOLO esta vista.';

-- -----------------------------------------------------------------------------
-- Agregado global: 1 fila por (indicador, unidad).
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
  'Agregado de sgs_v_indicador_propuesta. 1 fila por (indicador, unidad). '
  'Consumida por getMetasConvenio() y audit_resultados.mjs.';
