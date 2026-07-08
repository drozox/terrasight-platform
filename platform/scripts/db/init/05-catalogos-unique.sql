-- =============================================================================
-- 05-catalogos-unique.sql
--
-- HU-TC-03 — Endurecimiento + backfill de los catalogos
-- sgs_com_componente y sgs_com_accion.
--
-- 1. Backfill idempotente: el modelo BDG original define 3 componentes x 2
--    acciones = 6 acciones. La BD de ejemplo solo trae 4. Insertamos las 2
--    faltantes (A1/C3 y A2/C3) si no existen.
-- 2. UNIQUE constraints:
--      - sgs_com_componente.nombre UNIQUE
--      - sgs_com_accion (id_componente, nombre) UNIQUE
--    Defensa en profundidad + habilita ON CONFLICT en el codigo de la app.
-- 3. Auditoria temporal:
--      - created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
--      - updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
--      - Trigger trg_*_updated_at que mantiene updated_at en cada UPDATE.
--    Backfill para filas existentes: created_at = NOW() (mismo valor para
--    todas, es OK porque no teniamos esta columna antes).
-- 4. FK ON DELETE RESTRICT se mantiene (queremos evitar borrar accidentalmente
--    un componente con acciones, o una accion con propuestas).
-- 5. ON UPDATE CASCADE en la FK de sgs_com_accion -> sgs_com_componente para
--    soportar renumeracion de id_componente sin tocar manualmente las filas.
--
-- Idempotente: corre varias veces sin romper.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Backfill de las 2 acciones faltantes (A1/C3, A2/C3)
-- -----------------------------------------------------------------------------

-- Localizamos el id_componente de C3. Si no existe (esquema vacio), salimos
-- del INSERT sin error: el componente debe crearse via UI primero.
DO $$
DECLARE
    v_id_c3 INTEGER;
BEGIN
    SELECT id_componente INTO v_id_c3 FROM sgs_com_componente WHERE nombre = 'C3';
    IF v_id_c3 IS NULL THEN
        RAISE NOTICE 'No existe componente C3 todavia; saltando backfill de acciones.';
        RETURN;
    END IF;

    -- A1 / C3
    IF NOT EXISTS (
        SELECT 1 FROM sgs_com_accion WHERE id_componente = v_id_c3 AND nombre = 'A1'
    ) THEN
        INSERT INTO sgs_com_accion (nombre, id_componente) VALUES ('A1', v_id_c3);
    END IF;

    -- A2 / C3
    IF NOT EXISTS (
        SELECT 1 FROM sgs_com_accion WHERE id_componente = v_id_c3 AND nombre = 'A2'
    ) THEN
        INSERT INTO sgs_com_accion (nombre, id_componente) VALUES ('A2', v_id_c3);
    END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 2. Auditoria temporal: created_at + updated_at
-- -----------------------------------------------------------------------------

ALTER TABLE sgs_com_componente
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE sgs_com_componente
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE sgs_com_accion
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE sgs_com_accion
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN sgs_com_componente.created_at IS 'Fecha de alta del componente (auditoria).';
COMMENT ON COLUMN sgs_com_componente.updated_at IS 'Fecha de ultima modificacion (mantenido por trigger).';
COMMENT ON COLUMN sgs_com_accion.created_at      IS 'Fecha de alta de la accion (auditoria).';
COMMENT ON COLUMN sgs_com_accion.updated_at      IS 'Fecha de ultima modificacion (mantenido por trigger).';

-- -----------------------------------------------------------------------------
-- 3. Trigger updated_at (reutilizable, una funcion para ambas tablas)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sgs_com_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sgs_com_componente_updated_at ON sgs_com_componente;
CREATE TRIGGER trg_sgs_com_componente_updated_at
    BEFORE UPDATE ON sgs_com_componente
    FOR EACH ROW EXECUTE FUNCTION sgs_com_set_updated_at();

DROP TRIGGER IF EXISTS trg_sgs_com_accion_updated_at ON sgs_com_accion;
CREATE TRIGGER trg_sgs_com_accion_updated_at
    BEFORE UPDATE ON sgs_com_accion
    FOR EACH ROW EXECUTE FUNCTION sgs_com_set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. UNIQUE constraints
--    Primero limpiamos duplicados que puedan existir (no deberia, pero por
--    las dudas si alguien metio mano via SQL).
-- -----------------------------------------------------------------------------

-- Componente: hoy no hay duplicados por el CHECK, pero la UNIQUE habilita
-- ON CONFLICT (nombre) en la app.
DO $$
DECLARE
        dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT nombre, COUNT(*) c
        FROM sgs_com_componente
        GROUP BY nombre
        HAVING COUNT(*) > 1
    ) d;
    IF dup_count > 0 THEN
        RAISE EXCEPTION 'Existen % duplicados en sgs_com_componente.nombre; resolver manualmente antes de migrar.', dup_count;
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sgs_com_componente_nombre
    ON sgs_com_componente (nombre);

-- Accion: defensiva contra duplicados por bug de UI. Antes de crear la UNIQUE,
-- nos aseguramos que no haya duplicados. Si los hay (no deberia por CHECK +
-- FK pero por defensa), los dejamos y abortamos para que el operador decida.
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT id_componente, nombre, COUNT(*) c
        FROM sgs_com_accion
        GROUP BY id_componente, nombre
        HAVING COUNT(*) > 1
    ) d;
    IF dup_count > 0 THEN
        RAISE EXCEPTION 'Existen % duplicados en sgs_com_accion(id_componente,nombre); resolver manualmente antes de migrar.', dup_count;
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sgs_com_accion_componente_nombre
    ON sgs_com_accion (id_componente, nombre);

-- -----------------------------------------------------------------------------
-- 5. FK con ON UPDATE CASCADE (defensa ante renumeracion manual de id)
-- -----------------------------------------------------------------------------

ALTER TABLE sgs_com_accion
    DROP CONSTRAINT IF EXISTS fk_accion_id_componente;

ALTER TABLE sgs_com_accion
    ADD CONSTRAINT fk_accion_id_componente
        FOREIGN KEY (id_componente)
        REFERENCES sgs_com_componente (id_componente)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 6. Comentarios actualizados (algunos no existen arriba)
-- -----------------------------------------------------------------------------

COMMENT ON INDEX uq_sgs_com_componente_nombre       IS 'Garantiza nombres de componente unicos (defensa + habilita ON CONFLICT).';
COMMENT ON INDEX uq_sgs_com_accion_componente_nombre IS 'Garantiza unicidad de (componente, accion) — el modelo BDG define 3x2=6.';
COMMENT ON INDEX idx_sgs_com_accion_id_componente   IS 'Acelera JOINs por componente.';

-- =============================================================================
-- Verificacion final: deberia haber 3 componentes y 6 acciones tras backfill.
-- =============================================================================
DO $$
DECLARE
    v_comp INTEGER;
    v_acc  INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_comp FROM sgs_com_componente;
    SELECT COUNT(*) INTO v_acc  FROM sgs_com_accion;
    RAISE NOTICE 'Catalogos: % componentes, % acciones (esperado 3 / 6).', v_comp, v_acc;
END
$$;