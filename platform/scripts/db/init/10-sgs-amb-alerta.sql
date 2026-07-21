-- =============================================================================
-- 10-sgs-amb-alerta.sql (DEBT-5)
--
-- Crea la tabla `sgs_amb_alerta` para que el módulo de alertas deje de
-- depender de un set hardcodeado en el repo. Cada fila es una alerta
-- generada por el sistema (sensor, post-proceso, o admin manual).
--
-- Estados:
--   'activa'     — pendiente de atención
--   'descartada' — revisada y marcada como no relevante
--   'resuelta'   — atendida y cerrada
--
-- Severidades:
--   'error'    — crítica (requiere acción inmediata)
--   'warning'  — preventiva
--   'info'     — informativa
--
-- Backfill inicial: las 5 alertas demo que estaban hardcodeadas en
-- `getAlertas()`, para que el sistema se vea igual al deployar la migration
-- (y no quede con lista vacía).
-- =============================================================================

CREATE TABLE IF NOT EXISTS sgs_amb_alerta (
    id_alerta    BIGSERIAL PRIMARY KEY,
    tipo         VARCHAR(16) NOT NULL,
    titulo       VARCHAR(255) NOT NULL,
    descripcion  TEXT NOT NULL,
    fecha        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado       VARCHAR(16) NOT NULL DEFAULT 'activa',
    id_usuario   INTEGER,                       -- quién la atendió (nullable)
    id_propuesta INTEGER,                       -- propuesta relacionada (nullable)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sgs_amb_alerta IS
  'Alertas del sistema de monitoreo ambiental (sensor + post-proceso + admin).';
COMMENT ON COLUMN sgs_amb_alerta.tipo IS
  'Severidad: error | warning | info.';
COMMENT ON COLUMN sgs_amb_alerta.estado IS
  'Estado operativo: activa | descartada | resuelta.';
COMMENT ON COLUMN sgs_amb_alerta.id_usuario IS
  'Usuario que marcó como descartada/resuelta (NULL mientras esté activa).';
COMMENT ON COLUMN sgs_amb_alerta.id_propuesta IS
  'Propuesta relacionada (opcional, NULL para alertas globales).';

-- Idempotente con DO-blocks para los constraints.
DO $$
BEGIN
    ALTER TABLE sgs_amb_alerta
        ADD CONSTRAINT chk_sgs_amb_alerta_tipo
        CHECK (tipo IN ('error', 'warning', 'info'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE sgs_amb_alerta
        ADD CONSTRAINT chk_sgs_amb_alerta_estado
        CHECK (estado IN ('activa', 'descartada', 'resuelta'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- Foreign keys (nullable, ON DELETE SET NULL para no perder alertas si se
-- borra la propuesta o el usuario).
DO $$
BEGIN
    ALTER TABLE sgs_amb_alerta
        ADD CONSTRAINT fk_sgs_amb_alerta_id_propuesta
        FOREIGN KEY (id_propuesta) REFERENCES sgs_pro_propuesta(id_propuesta)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE sgs_amb_alerta
        ADD CONSTRAINT fk_sgs_amb_alerta_id_usuario
        FOREIGN KEY (id_usuario) REFERENCES sgs_adm_usuario(id_usuario)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_sgs_amb_alerta_estado_fecha
    ON sgs_amb_alerta (estado, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_sgs_amb_alerta_tipo
    ON sgs_amb_alerta (tipo);

-- -----------------------------------------------------------------------------
-- Backfill: 5 alertas demo (las que estaban hardcodeadas en getAlertas()).
-- Solo si la tabla está vacía, para que la migration sea idempotente.
-- -----------------------------------------------------------------------------
INSERT INTO sgs_amb_alerta (tipo, titulo, descripcion, fecha)
SELECT * FROM (VALUES
    ('error',
     'Deforestación Crítica',
     'Detección de tala ilegal en sector San Rafael, Guasca — pérdida de cobertura boscosa >0.5 ha en 7 días.',
     NOW() - INTERVAL '0 days'),
    ('warning',
     'Nivel Hídrico Bajo',
     'Estación hidrométrica Río Negro (Est. 04) reporta caudal 18% bajo el promedio histórico para el mes.',
     NOW() - INTERVAL '5 days'),
    ('warning',
     'Propuestas con Avance Bajo',
     '3 propuestas de tipo punto en finca El Edén (Guasca) llevan más de 30 días con avance <25%.',
     NOW() - INTERVAL '7 days'),
    ('info',
     'Nueva Fuente Hídrica Registrada',
     'Se incorporó la quebrada La Parada al inventario — microcuenca Río Bogotá alto, municipio Cogua.',
     NOW() - INTERVAL '11 days'),
    ('info',
     'Reporte Mensual Disponible',
     'Reporte de monitoreo correspondiente a abril 2026 listo para descarga. 3 predios intervenidos, 2.3 ha.',
     NOW() - INTERVAL '18 days')
) AS v(tipo, titulo, descripcion, fecha)
WHERE NOT EXISTS (SELECT 1 FROM sgs_amb_alerta);

-- También agregar la nueva migration al script db-migrate.ps1
-- (esto lo hace el coder con DEBT-1.1 o se hace en otro PR).
