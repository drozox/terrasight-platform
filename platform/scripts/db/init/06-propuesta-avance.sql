-- =============================================================================
-- 06-propuesta-avance.sql
--
-- Crea la tabla `sgs_pro_propuesta_avance` para registrar el histórico de
-- avance porcentual (0-100) de cada propuesta (HU-IC-04). Cada fila es un
-- evento: el avance actual se obtiene como el mayor created_at de la
-- propuesta. Las notas pueden dejarse vacías pero se mantienen en la misma
-- fila para tener un único timeline por propuesta.
--
-- Idempotente: CREATE TABLE / INDEX / FK con IF NOT EXISTS y DO-blocks
-- para los constraints. Backfill opcional: inserta un evento inicial por
-- propuesta preexistente, derivado del tipo de geometría
-- (punto=20, linea=75, poligono=100). WHERE NOT EXISTS evita duplicar
-- si se corre la migración dos veces.
-- =============================================================================

CREATE TABLE IF NOT EXISTS sgs_pro_propuesta_avance (
    id_avance    BIGSERIAL PRIMARY KEY,
    id_propuesta INTEGER NOT NULL,
    avance_pct   INTEGER NOT NULL,
    nota         TEXT    NOT NULL DEFAULT '',
    id_usuario   INTEGER,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sgs_pro_propuesta_avance IS
  'Histórico de avance porcentual de cada propuesta (HU-IC-04). Una fila por evento.';

COMMENT ON COLUMN sgs_pro_propuesta_avance.id_avance IS
  'Identificador único del evento de avance (BIGSERIAL por si la tabla crece mucho).';

COMMENT ON COLUMN sgs_pro_propuesta_avance.id_propuesta IS
  'FK a sgs_pro_propuesta. ON DELETE CASCADE: si se borra la propuesta, se borra su histórico.';

COMMENT ON COLUMN sgs_pro_propuesta_avance.avance_pct IS
  'Porcentaje de avance (0-100). CHECK lo enforcea; lo más fácil es subir monotónicamente.';

COMMENT ON COLUMN sgs_pro_propuesta_avance.nota IS
  'Comentario libre del gestor/admin al registrar el avance. Default vacío para eventos automáticos.';

COMMENT ON COLUMN sgs_pro_propuesta_avance.id_usuario IS
  'FK a sgs_adm_usuario. NULL en el backfill inicial; SET NULL si se borra el usuario.';

COMMENT ON COLUMN sgs_pro_propuesta_avance.created_at IS
  'Timestamp del evento. Ordenamos por esta columna DESC para el timeline.';

-- CHECK constraint con DO-block para que la migración sea idempotente:
-- 23514 (check_violation) o 42P07 no se da con ADD CONSTRAINT, pero
-- '42710' (duplicate_object) sí si se corre dos veces.
DO $$
BEGIN
    ALTER TABLE sgs_pro_propuesta_avance
        ADD CONSTRAINT chk_sgs_pro_propuesta_avance_pct
        CHECK (avance_pct BETWEEN 0 AND 100);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- Foreign keys (idem)
DO $$
BEGIN
    ALTER TABLE sgs_pro_propuesta_avance
        ADD CONSTRAINT fk_sgs_pro_propuesta_avance_id_propuesta
        FOREIGN KEY (id_propuesta) REFERENCES sgs_pro_propuesta(id_propuesta)
        ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE sgs_pro_propuesta_avance
        ADD CONSTRAINT fk_sgs_pro_propuesta_avance_id_usuario
        FOREIGN KEY (id_usuario) REFERENCES sgs_adm_usuario(id_usuario)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- Índice principal: timeline por propuesta, ordenado por fecha DESC
CREATE INDEX IF NOT EXISTS idx_sgs_pro_propuesta_avance_id_propuesta
    ON sgs_pro_propuesta_avance (id_propuesta, created_at DESC);

-- -----------------------------------------------------------------------------
-- Backfill: para cada propuesta existente, un evento inicial derivado del
-- tipo. WHERE NOT EXISTS evita duplicar si se re-ejecuta.
-- -----------------------------------------------------------------------------
INSERT INTO sgs_pro_propuesta_avance (id_propuesta, avance_pct, nota, id_usuario, created_at)
SELECT
    pp.id_propuesta,
    CASE pp.tipo
        WHEN 'punto'    THEN 20
        WHEN 'linea'    THEN 75
        WHEN 'poligono' THEN 100
        ELSE                0
    END,
    'Backfill inicial (migración 06)',
    NULL,
    NOW()
FROM sgs_pro_propuesta pp
WHERE NOT EXISTS (
    SELECT 1 FROM sgs_pro_propuesta_avance av
    WHERE  av.id_propuesta = pp.id_propuesta
);
