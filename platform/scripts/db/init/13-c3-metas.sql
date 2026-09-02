-- =============================================================================
-- S5.M.13 — Metas C3 + acciones C3A1/C3A2
--
-- Cierra el gap que dejó S5.M.12: el modelo BDG tiene 3 componentes (C1/C2/C3)
-- pero la BD solo había cargado acciones para C1 y C2 (id_accion 1..4). Esto
-- rompía la meta "35 predios en áreas protegidas" del C3: filtrar por
-- componente C3 devolvía 0 propuestas.
--
-- Esta migración:
--   1. Crea las acciones C3A1 y C3A2 (id_accion nuevos ~5 y ~6).
--   2. Reasigna las 2 propuestas del seed que están comentadas como `-- C3`
--      pero tienen id_accion=1 (C1A1) — son las de "Bebedero" y "Tanque".
--      Idempotente: solo se ejecuta si todavía están en id_accion=1.
--   3. Re-define sgs_v_metas_resumen agregando la fila C3 (35 predios).
--
-- En producción (con GDB importada): los INSERTs de C3A1/A2 son idempotentes.
-- Las propuestas con `id_accion` propio de la GDB no se tocan (la cláusula
-- WHERE filtra por `id_accion = 1` que es un valor del seed).
--
-- Filtro del C3 meta (consistente con lo pedido):
--   - Propuestas con componente C3 (vía C3A1 o C3A2)
--   - Para cada predio asociado, ¿está en RFP O en Páramos?
--   - COUNT(DISTINCT id_predio) = current_value
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Acciones C3A1 y C3A2 (idempotente)
--    sgs_com_componente ya tiene fila para 'C3' (sembrada en 01-schema).
--    No hay UNIQUE constraint en (nombre, id_componente), así que usamos
--    NOT EXISTS para evitar duplicados al re-aplicar.
-- -----------------------------------------------------------------------------
INSERT INTO sgs_com_accion (nombre, id_componente)
SELECT 'A1', c.id_componente
FROM   sgs_com_componente c
WHERE  c.nombre = 'C3'
  AND  NOT EXISTS (
      SELECT 1
      FROM   sgs_com_accion a
      WHERE  a.nombre = 'A1'
        AND  a.id_componente = c.id_componente
  );

INSERT INTO sgs_com_accion (nombre, id_componente)
SELECT 'A2', c.id_componente
FROM   sgs_com_componente c
WHERE  c.nombre = 'C3'
  AND  NOT EXISTS (
      SELECT 1
      FROM   sgs_com_accion a
      WHERE  a.nombre = 'A2'
        AND  a.id_componente = c.id_componente
  );

COMMENT ON COLUMN sgs_com_accion.id_componente IS
    'FK a sgs_com_componente. C3A1 y C3A2 fueron agregados en migración 13.';

-- -----------------------------------------------------------------------------
-- 2. Reasignación de las 2 propuestas del seed mal catalogadas.
--    El seed 02-datos-ejemplo.sql tiene:
--      ('punto', 'Bebedero - Finca El Edén', 1, 1, 1),    -- C3
--      ('punto', 'Tanque - Finca El Porvenir', 2, 1, 1),   -- C3
--    con id_accion=1 (C1A1) — claramente un error del seed (el comentario
--    dice C3). Las reasignamos a C3A1 (la primera acción de C3 que encontremos).
--
--    WHERE id_accion = 1 hace el UPDATE idempotente: si ya se reasignó
--    (o nunca estuvo así), no hace nada.
--
--    En BD con datos reales de la GDB: como la GDB probablemente tiene
--    id_accion distintos, esta cláusula no tocará nada.
-- -----------------------------------------------------------------------------
UPDATE sgs_pro_propuesta
SET    id_accion = (
           SELECT a.id_accion
           FROM   sgs_com_accion a
           JOIN   sgs_com_componente c ON a.id_componente = c.id_componente
           WHERE  a.nombre = 'A1' AND c.nombre = 'C3'
           ORDER  BY a.id_accion
           LIMIT  1
       )
WHERE  id_propuesta IN (7, 8)   -- IDs fijos del seed (Bebedero + Tanque)
  AND  id_accion = 1;          -- Solo si todavía están en C1A1

-- -----------------------------------------------------------------------------
-- 3. Re-define sgs_v_metas_resumen con la fila C3 agregada.
--    CREATE OR REPLACE VIEW reemplaza la definición previa (de migración 12).
--    El contenido de C1A1..C2A2 es idéntico al de 12-metas.sql; el cambio
--    es solo la nueva CTE c3_predios_protegidos + un UNION ALL adicional.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW sgs_v_metas_resumen AS
WITH
-- ============ C1A1: Conservación del recurso hídrico ============
c1a1_cercos_vivos AS (
    SELECT
        'C1'::text, 'A1'::text,
        'c1a1_cercos_vivos'::text, 'Cercos vivos'::text,
        12.0, 'km'::text,
        COALESCE(SUM(pl.longitud_km), 0)::numeric, 'km'::text,
        COUNT(*)
    FROM sgs_pro_propuesta_linea pl
    JOIN sgs_pro_propuesta    pp ON pl.id_propuesta = pp.id_propuesta
    JOIN sgs_com_accion       a  ON pp.id_accion   = a.id_accion
    JOIN sgs_com_componente   c  ON a.id_componente = c.id_componente
    WHERE c.nombre = 'C1' AND a.nombre = 'A1'
      AND pl.actividad ILIKE '%cerca viva%'
),
c1a1_aislamiento AS (
    SELECT
        'C1'::text, 'A1'::text,
        'c1a1_aislamiento'::text, 'Aislamientos (cerco de alambre)'::text,
        12.0, 'km'::text,
        COALESCE(SUM(pl.longitud_km), 0)::numeric, 'km'::text,
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
        'C1'::text, 'A2'::text,
        'c1a2_conectividad'::text, 'Conectividad'::text,
        15.0, 'ha'::text,
        COALESCE(SUM(pp2.area_ha), 0)::numeric, 'ha'::text,
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
        'C1'::text, 'A2'::text,
        'c1a2_silvopastoril'::text, 'Silvopastoriles'::text,
        15.0, 'ha'::text,
        COALESCE(SUM(pp2.area_ha), 0)::numeric, 'ha'::text,
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
        'C1'::text, 'A2'::text,
        'c1a2_agroforestal'::text, 'Agroforestales'::text,
        15.0, 'ha'::text,
        COALESCE(SUM(pp2.area_ha), 0)::numeric, 'ha'::text,
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
        'C2'::text, 'A1'::text,
        'c2a1_cosecha_agua'::text, 'Cosecha de agua'::text,
        79.0, 'unidades'::text,
        COUNT(*)::numeric, 'unidades'::text,
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
        'C2'::text, 'A1'::text,
        'c2a1_compostaje'::text, 'Kit de compostaje'::text,
        79.0, 'unidades'::text,
        COUNT(*)::numeric, 'unidades'::text,
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
        'C2'::text, 'A2'::text,
        'c2a2_estaciones_limnimetricas'::text, 'Estaciones limnimétricas'::text,
        7.0, 'unidades'::text,
        COUNT(*)::numeric, 'unidades'::text,
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
        'C2'::text, 'A2'::text,
        'c2a2_obras_captacion'::text, 'Obras de captación'::text,
        48.0, 'unidades'::text,
        COUNT(*)::numeric, 'unidades'::text,
        COUNT(*)
    FROM sgs_pro_propuesta_punto pp3
    JOIN sgs_pro_propuesta    pp ON pp3.id_propuesta = pp.id_propuesta
    JOIN sgs_com_accion       a  ON pp.id_accion    = a.id_accion
    JOIN sgs_com_componente   c  ON a.id_componente = c.id_componente
    WHERE c.nombre = 'C2' AND a.nombre = 'A2'
      AND (pp3.tipo_punto = 'obra_captacion' OR pp3.actividad ILIKE '%obra%captaci%n%')
),

-- ============ C3: 35 predios en áreas protegidas (RFP o Páramos) ============
--   Esta fila se reporta a nivel COMPONENTE (no acción específica). Por eso
--   `accion = '—'` (em-dash): marca "todas las acciones de C3".
--   current_value = COUNT(DISTINCT pr.id_predio) de los predios que:
--     - Tienen al menos 1 propuesta con componente C3
--     - Están en sgs_rel_predio_zonificacion_rfp O en sgs_rel_predio_paramos
--   count_propuestas = misma COUNT(DISTINCT pr.id_predio) — representa los
--   predios que efectivamente cuentan hacia la meta.
c3_predios_protegidos AS (
    SELECT
        'C3'::text, '—'::text,
        'c3_predios_protegidos'::text, 'Predios en áreas protegidas'::text,
        35.0, 'predios'::text,
        COUNT(DISTINCT pr.id_predio)::numeric, 'predios'::text,
        COUNT(DISTINCT pr.id_predio)
    FROM sgs_pro_propuesta pp
    JOIN sgs_com_accion       a  ON pp.id_accion   = a.id_accion
    JOIN sgs_com_componente   c  ON a.id_componente = c.id_componente
    JOIN sgs_pre_predio       pr ON pp.id_predio   = pr.id_predio
    WHERE c.nombre = 'C3'
      AND (
          EXISTS (SELECT 1 FROM sgs_rel_predio_zonificacion_rfp rfp WHERE rfp.id_predio = pr.id_predio)
       OR EXISTS (SELECT 1 FROM sgs_rel_predio_paramos         par WHERE par.id_predio = pr.id_predio)
      )
)
SELECT * FROM c1a1_cercos_vivos
UNION ALL SELECT * FROM c1a1_aislamiento
UNION ALL SELECT * FROM c1a2_conectividad
UNION ALL SELECT * FROM c1a2_silvopastoril
UNION ALL SELECT * FROM c1a2_agroforestal
UNION ALL SELECT * FROM c2a1_cosecha
UNION ALL SELECT * FROM c2a1_compostaje
UNION ALL SELECT * FROM c2a2_estaciones
UNION ALL SELECT * FROM c2a2_obras
UNION ALL SELECT * FROM c3_predios_protegidos;

COMMENT ON VIEW sgs_v_metas_resumen IS
    'Metas del convenio (HU-CO-?). Una fila por meta con current_value vs meta_value. '
    'C3 / 35 predios en áreas protegidas agregado en migración 13. La columna '
    'accion es `—` (em-dash) para metas a nivel componente (sin acción específica).';

-- -----------------------------------------------------------------------------
-- 4. Vista global: ahora cuenta 10 metas (no 9).
--    No necesita cambio — ya usa COUNT(*) sobre sgs_v_metas_resumen.
--    La dejamos como está para no duplicar SQL.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 5. Sanity check post-migración (solo log, no falla).
--    Útil para verificar que las acciones C3 existen y las propuestas
--    reasignadas tienen id_accion nuevo.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    c3a1_id  int;
    c3a2_id  int;
    pp7_acc  int;
    pp8_acc  int;
BEGIN
    SELECT a.id_accion INTO c3a1_id
    FROM sgs_com_accion a JOIN sgs_com_componente c ON a.id_componente = c.id_componente
    WHERE a.nombre = 'A1' AND c.nombre = 'C3' ORDER BY a.id_accion LIMIT 1;
    SELECT a.id_accion INTO c3a2_id
    FROM sgs_com_accion a JOIN sgs_com_componente c ON a.id_componente = c.id_componente
    WHERE a.nombre = 'A2' AND c.nombre = 'C3' ORDER BY a.id_accion LIMIT 1;
    SELECT id_accion INTO pp7_acc FROM sgs_pro_propuesta WHERE id_propuesta = 7;
    SELECT id_accion INTO pp8_acc FROM sgs_pro_propuesta WHERE id_propuesta = 8;

    RAISE NOTICE '[13-c3-metas] C3A1 id_accion=%, C3A2 id_accion=%', c3a1_id, c3a2_id;
    RAISE NOTICE '[13-c3-metas] propuesta 7 (Bebedero) id_accion=%', pp7_acc;
    RAISE NOTICE '[13-c3-metas] propuesta 8 (Tanque)   id_accion=%', pp8_acc;
END $$;
