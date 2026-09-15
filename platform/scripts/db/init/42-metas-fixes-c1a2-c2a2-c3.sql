-- =============================================================================
-- 42-metas-fixes-c1a2-c2a2-c3.sql — DEEPSEEK-F4-fix + data quality
--
-- Corrige 3 bugs de la migración 40 (FUENTE ÚNICA DE METAS):
--
-- Bug #1 — Precedencia de AND/OR en C2A2 (estaciones, obras_captacion):
--   La query tenía `(c='C2' AND a='A2') OR c='C3' AND match`
--   que se interpretaba como `((C2 AND A2)) OR ((C3) AND match)` —
--   contando TODOS los puntos C2A2 (incluyendo Cosecha de agua, Kit de
--   compostaje). Fix: agregar paréntesis externos para que la actividad
--   matchee en AMBAS ramas. Verificado:
--     - estaciones:  102 → 7 (snapshot: 7) ✅
--     - obras_capt:  102 → 96 (snapshot: 96) ✅
--
-- Bug #2 — predios_c3 mapeado a C3U (vacío) en vez de C3A1 (39):
--   Los 39 predios del snapshot vienen de C3A1 (405 propuestas con id_predio,
--   39 distintos), NO de C3U (411 propuestas, 0 con id_predio). La migración
--   41 creó la fila "U" para C3 pero las propuestas históricas apuntan a A1.
--   Fix: aceptar `a.nombre IN ('U', 'A1')`. Verificado:
--     - predios_c3: 0 → 39 (snapshot: 39) ✅
--
-- Bug #3 — C1A2 conectividad/silvopastoril/agroforestal devuelve 0:
--   Los nombres en BD NO son "conectividad/silvopastoril/agroforestal":
--     - conectividad → "Franja de Conectividad" (en LÍNEAS, 35 filas, 5.20 km)
--     - silvopastoril → "Pastos arbolados" + "Rastrojos" + "Arboles dispersos"
--       (en POLÍGONOS, 27 filas, 6.46 ha EXACTO)
--     - agroforestal → "Bosques Comestibles" + "Modulos alta densidad" +
--       "Banco de proteína" (en POLÍGONOS, 10 filas, 4.44 ha EXACTO)
--   Fix: redefinir las 3 queries con los patrones correctos. conectividad
--   se lee desde sgs_pro_propuesta_linea (km); silvopastoril y agroforestal
--   desde sgs_pro_propuesta_poligono (ha).
--
-- Adicional: hay 72 líneas en C1A2 etiquetadas como "Aislamiento" (4.08 km),
-- "Cercas multiestratificadas" (1.79 km) y "Cercos vivos" (2.60 km) que
-- están MAL etiquetadas (deberían ser C1A1). Es data quality issue — NO se
-- corrige acá (será limpieza de datos en sprint futuro). Solo documentado.
-- =============================================================================

DROP VIEW IF EXISTS sgs_v_indicador_global;
DROP VIEW IF EXISTS sgs_v_indicador_propuesta;

-- -----------------------------------------------------------------------------
-- Detalle: 1 fila por indicador+propuesta (o fila hija).
-- -----------------------------------------------------------------------------
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
-- C1A2 — Conectividad (líneas) + silvopastoril (polígonos) + agroforestal (polígonos)
--   Fix #3: nombres reales del GDB son distintos al brief.
--   Datos verificados: silvopastoril=6.46 ha EXACTO, agroforestal=4.44 ha EXACTO.
-- ===========================================================================
UNION ALL
-- conectividad: líneas con "Franja de Conectividad" (35 filas, 5.20 km)
SELECT 'conectividad'::text AS indicador_key,
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
WHERE c.nombre = 'C1' AND a.nombre = 'A2'
  AND unaccent(pl.actividad) ILIKE unaccent('%conectividad%')

UNION ALL
-- silvopastoril: polígonos con "Pastos arbolados", "Rastrojos", "Arboles dispersos"
--   (16+8+3 = 27 filas, 4.32+0.93+1.21 = 6.46 ha EXACTO)
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
  AND (unaccent(pq.actividad) ILIKE unaccent('%pastos arbolados%')
    OR unaccent(pq.actividad) ILIKE unaccent('%rastrojo%')
    OR unaccent(pq.actividad) ILIKE unaccent('%arboles dispersos%'))

UNION ALL
-- agroforestal: polígonos con "Bosques Comestibles", "Modulos alta densidad",
--   "Banco de proteína" (5+3+2 = 10 filas, 1.27+2.90+0.27 = 4.44 ha EXACTO)
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
  AND (unaccent(pq.actividad) ILIKE unaccent('%bosques comestibles%')
    OR unaccent(pq.actividad) ILIKE unaccent('%modulos%alta densidad%')
    OR unaccent(pq.actividad) ILIKE unaccent('%banco%proteina%'))

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
-- C2A2 — Estaciones + obras de captación (puntos, suma TODAS C2A2+C3)
--   Fix #1: paréntesis externos en el WHERE para que el filtro de actividad
--   aplique a AMBAS ramas (C2A2 y C3), no solo a C3. Sin fix, contaba 102
--   (todos los C2A2 puntos porque la primera rama del OR no tenía filtro
--   de actividad). Con fix: 7 estaciones + 96 obras = matchea snapshot.
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
-- C3 — Predios intervenidos en áreas protegidas
--   Fix #2: aceptar tanto la acción U (creada por migración 41) como la A1
--   (donde realmente están las 405 propuestas con id_predio). Sin fix, solo
--   aceptaba U y devolvía 0 (las 411 C3U no tienen id_predio).
--   Agregación = COUNT(DISTINCT id_predio), no SUM(medida).
-- ===========================================================================
UNION ALL
SELECT 'predios_c3', pp.id_propuesta, pp.id_predio, 1::numeric, 'predios', 'count_distinct_predio', pp.tipo
FROM sgs_pro_propuesta pp
JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
JOIN sgs_com_componente c ON c.id_componente = a.id_componente
WHERE c.nombre = 'C3' AND a.nombre IN ('U', 'A1') AND pp.id_predio IS NOT NULL;

COMMENT ON VIEW sgs_v_indicador_propuesta IS
  'Fuente única de verdad (DEEPSEEK-F4 + Fix #1, #2, #3 migración 42). '
  'Mapea cada propuesta/fila al indicador del convenio usando id_accion + '
  'actividad específica. Fixes: paréntesis C2A2, predios_c3 acepta A1+U, '
  'C1A2 con 3 geometrías (líneas para conectividad, polígonos para '
  'silvopastoril/agroforestal). Cambiar un patrón = editar SOLO esta vista.';

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
