-- =============================================================================
-- Migration 43 — Alarmas extendidas (AJUSTE 5)
--
-- Reusa sgs_pro_propuesta_alarma (creada en migracion 38) y la extiende con:
--   - 5 tipos nuevos (compatibles con los 5 originales): permiso_ambiental,
--     conflicto_linderos, acceso_bloqueado, materiales_insuficientes,
--     problema_climatico
--   - prioridad (ALTA / MEDIA / BAJA) para orden y filtros
--   - responsable_id (FK sgs_adm_usuario) — a quien se le asigna la resolucion
--   - fecha_estimada (DATE) — cuando se espera resolver
--   - evidencia_url (TEXT) — link a foto/documento soporte
--
-- Backward-compat: las alarmas existentes quedan con prioridad='MEDIA',
-- responsable_id=NULL, fecha_estimada=NULL, evidencia_url=''. Ninguna fila
-- queda invalidada por la expansion del CHECK porque los 5 valores originales
-- siguen siendo validos.
-- =============================================================================

-- 1) Drop CHECK viejo para poder agregar tipos sin re-crear la tabla.
ALTER TABLE sgs_pro_propuesta_alarma
    DROP CONSTRAINT IF EXISTS sgs_pro_propuesta_alarma_tipo_check;

-- 2) Re-add CHECK con los 10 valores validos (5 originales + 5 nuevos).
ALTER TABLE sgs_pro_propuesta_alarma
    ADD CONSTRAINT sgs_pro_propuesta_alarma_tipo_check
    CHECK (tipo IN (
        'firma_pendiente',
        'no_autorizada_comunidad',
        'problema_tecnico',
        'requiere_visita',
        'otro',
        -- Nuevos (AJUSTE 5):
        'permiso_ambiental',
        'conflicto_linderos',
        'acceso_bloqueado',
        'materiales_insuficientes',
        'problema_climatico'
    ));

-- 3) Columnas nuevas (todas nullable o con DEFAULT para no romper filas).
ALTER TABLE sgs_pro_propuesta_alarma
    ADD COLUMN IF NOT EXISTS prioridad TEXT NOT NULL DEFAULT 'MEDIA',
    ADD COLUMN IF NOT EXISTS responsable_id INTEGER
        REFERENCES sgs_adm_usuario(id_usuario) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS fecha_estimada DATE,
    ADD COLUMN IF NOT EXISTS evidencia_url TEXT NOT NULL DEFAULT '';

-- 5) CHECK de prioridad (independiente para poder migrar el default sin error).
ALTER TABLE sgs_pro_propuesta_alarma
    DROP CONSTRAINT IF EXISTS sgs_pro_propuesta_alarma_prioridad_check;
ALTER TABLE sgs_pro_propuesta_alarma
    ADD CONSTRAINT sgs_pro_propuesta_alarma_prioridad_check
    CHECK (prioridad IN ('ALTA', 'MEDIA', 'BAJA'));

-- 6) Indices para los queries del listado (filtros / orden por prioridad).
CREATE INDEX IF NOT EXISTS idx_sgs_pro_propuesta_alarma_pendientes_prioridad
    ON sgs_pro_propuesta_alarma (id_propuesta, resuelta, prioridad)
    WHERE resuelta = FALSE;

CREATE INDEX IF NOT EXISTS idx_sgs_pro_propuesta_alarma_responsable
    ON sgs_pro_propuesta_alarma (responsable_id)
    WHERE resuelta = FALSE AND responsable_id IS NOT NULL;

-- 7) Comentarios para documentar los nuevos campos.
COMMENT ON COLUMN sgs_pro_propuesta_alarma.prioridad      IS 'ALTA / MEDIA / BAJA — default MEDIA para alarmas preexistentes';
COMMENT ON COLUMN sgs_pro_propuesta_alarma.responsable_id IS 'FK a sgs_adm_usuario — a quien se le asigna la resolucion';
COMMENT ON COLUMN sgs_pro_propuesta_alarma.fecha_estimada IS 'Fecha objetivo para resolver la alarma';
COMMENT ON COLUMN sgs_pro_propuesta_alarma.evidencia_url  IS 'Link a foto/documento que soporta el reporte';