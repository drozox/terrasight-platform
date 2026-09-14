-- =============================================================================
-- Migration 38 — Alarmas/problemas en propuestas (DEEPSEEK-F2.3)
--
-- Tabla para registrar issues/necesidades reportados por el equipo sobre
-- una intervención (ej. "requiere firma del propietario", "no autorizada
-- por la comunidad"). Permite al equipo priorizar y desbloquear.
--
-- Diferencias con `sgs_adm_auditoria_acceso`:
--   - Las alarmas son contenido de negocio, no auditoría técnica
--   - Tienen ciclo de vida (creación → resolución)
--   - Son visibles en la ficha de la intervención para todo el equipo
-- =============================================================================

CREATE TABLE IF NOT EXISTS sgs_pro_propuesta_alarma (
    id_alarma         SERIAL PRIMARY KEY,
    id_propuesta      INTEGER NOT NULL
                     REFERENCES sgs_pro_propuesta(id_propuesta)
                     ON DELETE CASCADE,
    tipo              TEXT NOT NULL
                     CHECK (tipo IN (
                        'firma_pendiente',
                        'no_autorizada_comunidad',
                        'problema_tecnico',
                        'requiere_visita',
                        'otro'
                     )),
    descripcion       TEXT NOT NULL DEFAULT '',
    creado_por        INTEGER
                     REFERENCES sgs_adm_usuario(id_usuario)
                     ON DELETE SET NULL,
    creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
    resuelta          BOOLEAN NOT NULL DEFAULT FALSE,
    resuelta_por      INTEGER
                     REFERENCES sgs_adm_usuario(id_usuario)
                     ON DELETE SET NULL,
    resuelta_en       TIMESTAMPTZ,
    nota_resolucion   TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_sgs_pro_propuesta_alarma_propuesta
    ON sgs_pro_propuesta_alarma (id_propuesta);

CREATE INDEX IF NOT EXISTS idx_sgs_pro_propuesta_alarma_pendientes
    ON sgs_pro_propuesta_alarma (id_propuesta, resuelta)
    WHERE resuelta = FALSE;

COMMENT ON TABLE  sgs_pro_propuesta_alarma IS 'Alarmas/problemas reportados por el equipo sobre una intervención (firma pendiente, no autorizada por la comunidad, etc.).';
COMMENT ON COLUMN sgs_pro_propuesta_alarma.id_alarma       IS 'PK';
COMMENT ON COLUMN sgs_pro_propuesta_alarma.id_propuesta    IS 'FK a sgs_pro_propuesta';
COMMENT ON COLUMN sgs_pro_propuesta_alarma.tipo            IS 'Tipo de alarma (enum: firma_pendiente, no_autorizada_comunidad, problema_tecnico, requiere_visita, otro)';
COMMENT ON COLUMN sgs_pro_propuesta_alarma.descripcion     IS 'Descripción libre del problema';
COMMENT ON COLUMN sgs_pro_propuesta_alarma.creado_por      IS 'Usuario que reportó la alarma';
COMMENT ON COLUMN sgs_pro_propuesta_alarma.creado_en       IS 'Fecha del reporte';
COMMENT ON COLUMN sgs_pro_propuesta_alarma.resuelta        IS 'TRUE cuando se resolvió';
COMMENT ON COLUMN sgs_pro_propuesta_alarma.resuelta_por    IS 'Usuario que resolvió';
COMMENT ON COLUMN sgs_pro_propuesta_alarma.resuelta_en     IS 'Fecha de resolución';
COMMENT ON COLUMN sgs_pro_propuesta_alarma.nota_resolucion IS 'Nota de cómo se resolvió';
