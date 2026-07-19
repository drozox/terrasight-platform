-- =============================================================================
-- 07-monitoreo-punto.sql
--
-- HU-MO-01..03 — Auditoria temporal sobre sgs_pro_propuesta_punto.
--
-- La tabla ya existe (migracion 01-schema.sql, linea ~557) y no tiene
-- created_at / updated_at. Sin esas columnas no podemos:
--   - ordenar la ficha por fecha real de alta,
--   - alimentar el KPI "ultima modificacion",
--   - soportar futuras vistas materializadas por ventana temporal.
--
-- Decisiones de diseno:
--   1. NO agregamos columna `estado_actual` al punto. El estado de la
--      intervencion vive en sgs_pro_propuesta.estado (migracion 04) y es
--      heredado por la propuesta_punto via FK id_propuesta. Mantener el
--      modelo limpio: una sola fuente de verdad para el estado.
--   2. NO creamos tabla de lecturas / umbrales (IoT, sensores). Eso es
--      scope de un sprint futuro (posiblemente Sprint 11+). Esta migracion
--      deja la base para esa adicion.
--   3. Reutilizamos la funcion sgs_com_set_updated_at() creada en
--      migracion 05. Es generica en su cuerpo (NEW.updated_at := NOW()) y
--      ya existe en la BD; solo la invocamos desde un trigger nuevo.
--      Si no existiera (BD muy vieja), CREATE OR REPLACE dentro de la
--      misma funcion garantiza idempotencia.
--
-- Idempotente: corre varias veces sin romper.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Columnas de auditoria
-- -----------------------------------------------------------------------------

ALTER TABLE sgs_pro_propuesta_punto
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE sgs_pro_propuesta_punto
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN sgs_pro_propuesta_punto.created_at IS
    'Fecha de alta del punto (auditoria). Backfill = NOW() al aplicar 07-monitoreo-punto.sql.';

COMMENT ON COLUMN sgs_pro_propuesta_punto.updated_at IS
    'Fecha de ultima modificacion (mantenido por trigger trg_sgs_pro_propuesta_punto_updated_at).';

-- -----------------------------------------------------------------------------
-- 2. Funcion trigger updated_at (reuso de 05 si existe; si no, CREATE OR REPLACE
--    con la misma firma). La funcion es body-generica asi que sirve para
--    cualquier tabla que tenga columna updated_at.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sgs_com_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 3. Trigger BEFORE UPDATE sobre sgs_pro_propuesta_punto
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_sgs_pro_propuesta_punto_updated_at ON sgs_pro_propuesta_punto;
CREATE TRIGGER trg_sgs_pro_propuesta_punto_updated_at
    BEFORE UPDATE ON sgs_pro_propuesta_punto
    FOR EACH ROW EXECUTE FUNCTION sgs_com_set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Indice por fecha de alta (DESC) para listados recientes y KPIs temporales
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_sgs_pro_propuesta_punto_created_at
    ON sgs_pro_propuesta_punto (created_at DESC);

COMMENT ON INDEX idx_sgs_pro_propuesta_punto_created_at IS
    'Acelera listados por fecha de alta (DESC) y futuros reportes por ventana temporal.';

-- =============================================================================
-- Verificacion final: 2 columnas, 1 trigger, 1 indice.
-- =============================================================================
DO $$
DECLARE
    v_col_count  INTEGER;
    v_trg_count  INTEGER;
    v_idx_count  INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_col_count
    FROM   information_schema.columns
    WHERE  table_name = 'sgs_pro_propuesta_punto'
      AND  column_name IN ('created_at', 'updated_at');

    SELECT COUNT(*) INTO v_trg_count
    FROM   pg_trigger
    WHERE  tgname = 'trg_sgs_pro_propuesta_punto_updated_at';

    SELECT COUNT(*) INTO v_idx_count
    FROM   pg_indexes
    WHERE  indexname = 'idx_sgs_pro_propuesta_punto_created_at';

    RAISE NOTICE 'Monitoreo: % columnas audit, % trigger, % indice (esperado 2 / 1 / 1).',
        v_col_count, v_trg_count, v_idx_count;
END
$$;
