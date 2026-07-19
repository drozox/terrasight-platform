-- =============================================================================
-- 08-cat-secundarios.sql
--
-- HU-TC-06..10 â€” Endurecimiento de los catalogos secundarios del modelo BDG:
--   bcs_lpa_municipio   (municipios)
--   bcs_lpa_vereda      (veredas)
--   sgs_pre_propietario (propietarios)
--   bcs_dh_microcuenca  (microcuencas)
--   sgs_pre_usuario     (beneficiarios)
--
-- Por tabla:
--   1. Auditoria temporal:
--      - created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
--      - updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
--      - Trigger trg_*_updated_at que mantiene updated_at en cada UPDATE
--        (reutiliza sgs_com_set_updated_at() de la migracion 05).
--   2. UNIQUE constraints (defensa en profundidad + habilita ON CONFLICT):
--      - bcs_lpa_municipio  (nombre_municipio, departamento)
--      - bcs_lpa_vereda     (id_municipio, nombre_vereda)
--      - sgs_pre_propietario(nombre_razon_social)
--      - bcs_dh_microcuenca (codigo)
--      - sgs_pre_usuario    (nombre, telefono)
--
-- Decisiones de diseno:
--   - Propietario: UNIQUE en nombre_razon_social sin citext ni LOWER. La BD
--     actual no tiene `citext` instalado y la mayoria de las inserciones
--     vienen del operador desde /catalogos. La UI puede normalizar a
--     MAYUSCULAS antes de enviar si quiere case-insensitive. Documentado
--     en el comentario del indice.
--   - Beneficiario: UNIQUE (nombre, telefono). Si telefono viene vacio no
--     se puede aplicar el ON CONFLICT en la app (telefono es parte de la
--     PK de unicidad), asi que la accion validar que telefono tenga
--     contenido antes de upsert. Ver actions.ts.
--   - Microcuenca: UNIQUE en `codigo` porque es el identificador de
--     negocio (corto, controlado). El nombre puede repetirse entre cuencas
--     distintas con el mismo toponimo en distintas zonas.
--   - Vereda: UNIQUE por municipio porque la vereda es relativa al
--     municipio. Dos municipios distintos pueden tener veredas con el
--     mismo nombre.
--   - Municipio: UNIQUE (nombre, departamento) porque el mismo nombre de
--     municipio puede existir en otro departamento (caso colombiano real).
--
-- Idempotente: corre varias veces sin romper.
-- =============================================================================


-- =============================================================================
-- 1. Funcion sgs_com_set_updated_at() ya existe de la migracion 05.
--    No la redefinimos. Si no existiera (instalacion nueva), CREATE OR
--    REPLACE lo cubre. La dejamos como red de seguridad.
-- =============================================================================
CREATE OR REPLACE FUNCTION sgs_com_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 2. bcs_lpa_municipio
-- =============================================================================

ALTER TABLE bcs_lpa_municipio
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE bcs_lpa_municipio
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN bcs_lpa_municipio.created_at IS 'Fecha de alta del municipio (auditoria).';
COMMENT ON COLUMN bcs_lpa_municipio.updated_at IS 'Fecha de ultima modificacion (mantenido por trigger).';

DROP TRIGGER IF EXISTS trg_bcs_lpa_municipio_updated_at ON bcs_lpa_municipio;
CREATE TRIGGER trg_bcs_lpa_municipio_updated_at
    BEFORE UPDATE ON bcs_lpa_municipio
    FOR EACH ROW EXECUTE FUNCTION sgs_com_set_updated_at();

-- UNIQUE: (nombre_municipio, departamento)
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT nombre_municipio, departamento, COUNT(*) c
        FROM bcs_lpa_municipio
        GROUP BY nombre_municipio, departamento
        HAVING COUNT(*) > 1
    ) d;
    IF dup_count > 0 THEN
        RAISE EXCEPTION 'Existen % duplicados en bcs_lpa_municipio(nombre_municipio, departamento); resolver manualmente antes de migrar.', dup_count;
    END IF;
END
$$;

DO $$
BEGIN
    BEGIN
        CREATE UNIQUE INDEX uq_bcs_lpa_municipio_nombre_departamento
            ON bcs_lpa_municipio (nombre_municipio, departamento);
    EXCEPTION WHEN duplicate_table THEN
        NULL;  -- ya existe
    END;
END
$$;

COMMENT ON INDEX uq_bcs_lpa_municipio_nombre_departamento IS
    'Garantiza unicidad de (municipio, departamento) â€” el mismo nombre puede existir en otro depto.';


-- =============================================================================
-- 3. bcs_lpa_vereda
-- =============================================================================

ALTER TABLE bcs_lpa_vereda
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE bcs_lpa_vereda
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN bcs_lpa_vereda.created_at IS 'Fecha de alta de la vereda (auditoria).';
COMMENT ON COLUMN bcs_lpa_vereda.updated_at IS 'Fecha de ultima modificacion (mantenido por trigger).';

DROP TRIGGER IF EXISTS trg_bcs_lpa_vereda_updated_at ON bcs_lpa_vereda;
CREATE TRIGGER trg_bcs_lpa_vereda_updated_at
    BEFORE UPDATE ON bcs_lpa_vereda
    FOR EACH ROW EXECUTE FUNCTION sgs_com_set_updated_at();

-- UNIQUE: (id_municipio, nombre_vereda)
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT id_municipio, nombre_vereda, COUNT(*) c
        FROM bcs_lpa_vereda
        GROUP BY id_municipio, nombre_vereda
        HAVING COUNT(*) > 1
    ) d;
    IF dup_count > 0 THEN
        RAISE EXCEPTION 'Existen % duplicados en bcs_lpa_vereda(id_municipio, nombre_vereda); resolver manualmente antes de migrar.', dup_count;
    END IF;
END
$$;

DO $$
BEGIN
    BEGIN
        CREATE UNIQUE INDEX uq_bcs_lpa_vereda_municipio_nombre
            ON bcs_lpa_vereda (id_municipio, nombre_vereda);
    EXCEPTION WHEN duplicate_table THEN
        NULL;  -- ya existe
    END;
END
$$;

COMMENT ON INDEX uq_bcs_lpa_vereda_municipio_nombre IS
    'Garantiza unicidad de (municipio, vereda) â€” la vereda es relativa al municipio.';


-- =============================================================================
-- 4. sgs_pre_propietario
-- =============================================================================

ALTER TABLE sgs_pre_propietario
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE sgs_pre_propietario
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN sgs_pre_propietario.created_at IS 'Fecha de alta del propietario (auditoria).';
COMMENT ON COLUMN sgs_pre_propietario.updated_at IS 'Fecha de ultima modificacion (mantenido por trigger).';

DROP TRIGGER IF EXISTS trg_sgs_pre_propietario_updated_at ON sgs_pre_propietario;
CREATE TRIGGER trg_sgs_pre_propietario_updated_at
    BEFORE UPDATE ON sgs_pre_propietario
    FOR EACH ROW EXECUTE FUNCTION sgs_com_set_updated_at();

-- UNIQUE: (nombre_razon_social). NO usamos citext/LOWER; la UI debe
-- normalizar a MAYUSCULAS antes de insertar.
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT nombre_razon_social, COUNT(*) c
        FROM sgs_pre_propietario
        GROUP BY nombre_razon_social
        HAVING COUNT(*) > 1
    ) d;
    IF dup_count > 0 THEN
        RAISE EXCEPTION 'Existen % duplicados en sgs_pre_propietario.nombre_razon_social; resolver manualmente antes de migrar.', dup_count;
    END IF;
END
$$;

DO $$
BEGIN
    BEGIN
        CREATE UNIQUE INDEX uq_sgs_pre_propietario_nombre
            ON sgs_pre_propietario (nombre_razon_social);
    EXCEPTION WHEN duplicate_table THEN
        NULL;  -- ya existe
    END;
END
$$;

COMMENT ON INDEX uq_sgs_pre_propietario_nombre IS
    'Garantiza unicidad de nombre_razon_social (case-sensitive: la UI normaliza a MAYUSCULAS).';


-- =============================================================================
-- 5. bcs_dh_microcuenca
-- =============================================================================

ALTER TABLE bcs_dh_microcuenca
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE bcs_dh_microcuenca
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN bcs_dh_microcuenca.created_at IS 'Fecha de alta de la microcuenca (auditoria).';
COMMENT ON COLUMN bcs_dh_microcuenca.updated_at IS 'Fecha de ultima modificacion (mantenido por trigger).';

DROP TRIGGER IF EXISTS trg_bcs_dh_microcuenca_updated_at ON bcs_dh_microcuenca;
CREATE TRIGGER trg_bcs_dh_microcuenca_updated_at
    BEFORE UPDATE ON bcs_dh_microcuenca
    FOR EACH ROW EXECUTE FUNCTION sgs_com_set_updated_at();

-- UNIQUE: (codigo)
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT codigo, COUNT(*) c
        FROM bcs_dh_microcuenca
        GROUP BY codigo
        HAVING COUNT(*) > 1
    ) d;
    IF dup_count > 0 THEN
        RAISE EXCEPTION 'Existen % duplicados en bcs_dh_microcuenca.codigo; resolver manualmente antes de migrar.', dup_count;
    END IF;
END
$$;

DO $$
BEGIN
    BEGIN
        CREATE UNIQUE INDEX uq_bcs_dh_microcuenca_codigo
            ON bcs_dh_microcuenca (codigo);
    EXCEPTION WHEN duplicate_table THEN
        NULL;  -- ya existe
    END;
END
$$;

COMMENT ON INDEX uq_bcs_dh_microcuenca_codigo IS
    'Garantiza unicidad de codigo (identificador de negocio de la microcuenca).';


-- =============================================================================
-- 6. sgs_pre_usuario (beneficiarios)
-- =============================================================================

ALTER TABLE sgs_pre_usuario
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE sgs_pre_usuario
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN sgs_pre_usuario.created_at IS 'Fecha de alta del beneficiario (auditoria).';
COMMENT ON COLUMN sgs_pre_usuario.updated_at IS 'Fecha de ultima modificacion (mantenido por trigger).';

DROP TRIGGER IF EXISTS trg_sgs_pre_usuario_updated_at ON sgs_pre_usuario;
CREATE TRIGGER trg_sgs_pre_usuario_updated_at
    BEFORE UPDATE ON sgs_pre_usuario
    FOR EACH ROW EXECUTE FUNCTION sgs_com_set_updated_at();

-- UNIQUE: (nombre, telefono). Si telefono esta vacio, la app no usa
-- ON CONFLICT (devuelve error explicito al usuario). Caso real: casi
-- todos los beneficiarios tienen telefono (campo NOT NULL en el modelo).
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT nombre, telefono, COUNT(*) c
        FROM sgs_pre_usuario
        GROUP BY nombre, telefono
        HAVING COUNT(*) > 1
    ) d;
    IF dup_count > 0 THEN
        RAISE EXCEPTION 'Existen % duplicados en sgs_pre_usuario(nombre, telefono); resolver manualmente antes de migrar.', dup_count;
    END IF;
END
$$;

DO $$
BEGIN
    BEGIN
        CREATE UNIQUE INDEX uq_sgs_pre_usuario_nombre_telefono
            ON sgs_pre_usuario (nombre, telefono);
    EXCEPTION WHEN duplicate_table THEN
        NULL;  -- ya existe
    END;
END
$$;

COMMENT ON INDEX uq_sgs_pre_usuario_nombre_telefono IS
    'Garantiza unicidad de (nombre, telefono) â€” la app solo hace UPSERT si telefono no esta vacio.';


-- =============================================================================
-- 7. Verificacion final
-- =============================================================================
DO $$
DECLARE
    v_municipios   INTEGER;
    v_veredas      INTEGER;
    v_propietarios INTEGER;
    v_microcuencas INTEGER;
    v_usuarios     INTEGER;
    v_uq           INTEGER;
    v_trg          INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_municipios   FROM bcs_lpa_municipio;
    SELECT COUNT(*) INTO v_veredas      FROM bcs_lpa_vereda;
    SELECT COUNT(*) INTO v_propietarios FROM sgs_pre_propietario;
    SELECT COUNT(*) INTO v_microcuencas FROM bcs_dh_microcuenca;
    SELECT COUNT(*) INTO v_usuarios     FROM sgs_pre_usuario;

    SELECT COUNT(*) INTO v_uq
    FROM pg_indexes
    WHERE indexname IN (
        'uq_bcs_lpa_municipio_nombre_departamento',
        'uq_bcs_lpa_vereda_municipio_nombre',
        'uq_sgs_pre_propietario_nombre',
        'uq_bcs_dh_microcuenca_codigo',
        'uq_sgs_pre_usuario_nombre_telefono'
    );

    SELECT COUNT(*) INTO v_trg
    FROM pg_trigger
    WHERE tgname IN (
        'trg_bcs_lpa_municipio_updated_at',
        'trg_bcs_lpa_vereda_updated_at',
        'trg_sgs_pre_propietario_updated_at',
        'trg_bcs_dh_microcuenca_updated_at',
        'trg_sgs_pre_usuario_updated_at'
    );

    RAISE NOTICE 'Catalogos secundarios: municipios=%, veredas=%, propietarios=%, microcuencas=%, usuarios=%', v_municipios, v_veredas, v_propietarios, v_microcuencas, v_usuarios;
    RAISE NOTICE 'UNIQUE indexes: %/5 esperados', v_uq;
    RAISE NOTICE 'Triggers updated_at: %/5 esperados', v_trg;
END
$$;
