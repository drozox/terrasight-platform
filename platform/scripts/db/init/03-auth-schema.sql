-- =============================================================================
-- Auth plataforma + auditoría (HU-AD-01..04)
--
-- Tablas NUEVAS en prefijo `sgs_adm_*`. NO confundir con `sgs_pre_usuario`:
-- esas son los beneficiarios del convenio (gente de la comunidad); acá viven
-- los usuarios del SISTEMA (personas de WWF/CAR/Natura que operan el SIG).
--
-- Convenciones:
-- - Passwords: bcryptjs (rounds=10), nunca texto plano.
-- - Sesiones: stateless (JWT en cookie HTTP-only). NO hay tabla de sesiones
--   porque usamos la estrategia `jwt` de next-auth.
-- - Auditoría: append-only, BIGSERIAL, particionable por mes si crece.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Roles del sistema (los 3 perfiles del PRD §3)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sgs_adm_rol (
    id_rol       SERIAL PRIMARY KEY,
    nombre       VARCHAR(32) UNIQUE NOT NULL,
    descripcion  VARCHAR(255) NOT NULL DEFAULT '',
    CONSTRAINT chk_adm_rol_nombre CHECK (nombre IN ('ADMIN','ANALISTA','GESTOR'))
);

COMMENT ON TABLE  sgs_adm_rol                  IS 'Roles de plataforma SIG. Catálogo cerrado: ADMIN / ANALISTA / GESTOR.';
COMMENT ON COLUMN sgs_adm_rol.nombre           IS 'Identificador textual del rol (enum-like).';
COMMENT ON COLUMN sgs_adm_rol.descripcion      IS 'Descripción funcional para UI y documentación.';

INSERT INTO sgs_adm_rol (nombre, descripcion) VALUES
    ('ADMIN',    'Administrador del sistema: gestión de usuarios, configuración, supervisión global.'),
    ('ANALISTA', 'Analista ambiental: consulta de datos técnicos, reportes, alertas, análisis espacial.'),
    ('GESTOR',   'Gestor de campo: actualización de estados de intervención, carga de datos de monitoreo.')
ON CONFLICT (nombre) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Usuarios del sistema (platform users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sgs_adm_usuario (
    id_usuario        SERIAL PRIMARY KEY,
    email             VARCHAR(255) UNIQUE NOT NULL,
    password_hash     TEXT NOT NULL,
    nombre            VARCHAR(255) NOT NULL,
    id_rol            INTEGER NOT NULL,
    activo            BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso_en  TIMESTAMPTZ,
    creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_adm_usuario_rol
        FOREIGN KEY (id_rol) REFERENCES sgs_adm_rol(id_rol)
);

COMMENT ON TABLE  sgs_adm_usuario                  IS 'Usuarios que operan la plataforma SIG. Vive separado de sgs_pre_usuario (beneficiarios).';
COMMENT ON COLUMN sgs_adm_usuario.email            IS 'Email único del usuario (case-insensitive en lookup, lowercase normalizado al insertar).';
COMMENT ON COLUMN sgs_adm_usuario.password_hash    IS 'Hash bcrypt (bcryptjs rounds=10). Nunca se devuelve al cliente.';
COMMENT ON COLUMN sgs_adm_usuario.id_rol           IS 'Rol del sistema. FK a sgs_adm_rol.';
COMMENT ON COLUMN sgs_adm_usuario.activo           IS 'FALSE bloquea el login sin borrar el usuario.';
COMMENT ON COLUMN sgs_adm_usuario.ultimo_acceso_en IS 'Última vez que se autenticó exitosamente. Actualizado en cada login.';
COMMENT ON COLUMN sgs_adm_usuario.creado_en        IS 'Momento de creación de la cuenta.';
COMMENT ON COLUMN sgs_adm_usuario.actualizado_en   IS 'Momento del último cambio (incluye reset de password y cambio de rol).';

CREATE INDEX IF NOT EXISTS idx_adm_usuario_email ON sgs_adm_usuario (lower(email));
CREATE INDEX IF NOT EXISTS idx_adm_usuario_rol   ON sgs_adm_usuario (id_rol);
CREATE INDEX IF NOT EXISTS idx_adm_usuario_activo ON sgs_adm_usuario (activo) WHERE activo = TRUE;

-- -----------------------------------------------------------------------------
-- Auditoría de accesos (HU-AD-04) — append-only, BIGSERIAL
-- Eventos típicos:
--   LOGIN_OK     — autenticación exitosa
--   LOGIN_FAIL   — email no existe, password mal, cuenta desactivada
--   LOGOUT       — cierre de sesión
--   ACCESS_DENY  — intento de acceso a recurso sin rol suficiente
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sgs_adm_auditoria_acceso (
    id_evento     BIGSERIAL PRIMARY KEY,
    ocurrido_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    id_usuario    INTEGER,                                     -- NULL si fue un login fallido
    email_usado   VARCHAR(255),                                -- preserva el email intentado
    evento        VARCHAR(64) NOT NULL,
    recurso       VARCHAR(512),                                -- ruta o endpoint accedido
    ip            VARCHAR(64),
    user_agent    VARCHAR(255),
    exitoso       BOOLEAN NOT NULL,
    detalle       TEXT
);

COMMENT ON TABLE  sgs_adm_auditoria_acceso               IS 'Bitácora append-only de accesos al sistema. Nunca se borra, solo se archiva.';
COMMENT ON COLUMN sgs_adm_auditoria_acceso.id_usuario    IS 'FK a sgs_adm_usuario. NULL en LOGIN_FAIL cuando el email no existe.';
COMMENT ON COLUMN sgs_adm_auditoria_acceso.email_usado   IS 'Snapshot del email al momento del intento (puede no existir en la tabla de usuarios).';
COMMENT ON COLUMN sgs_adm_auditoria_acceso.evento        IS 'Tipo de evento: LOGIN_OK | LOGIN_FAIL | LOGOUT | ACCESS_DENY.';
COMMENT ON COLUMN sgs_adm_auditoria_acceso.recurso       IS 'Ruta o endpoint asociado (ej: /admin/usuarios, /predios/123).';
COMMENT ON COLUMN sgs_adm_auditoria_acceso.exitoso       IS 'TRUE = permitido, FALSE = denegado o fallido.';

CREATE INDEX IF NOT EXISTS idx_adm_audit_fecha ON sgs_adm_auditoria_acceso (ocurrido_en DESC);
CREATE INDEX IF NOT EXISTS idx_adm_audit_user  ON sgs_adm_auditoria_acceso (id_usuario);
CREATE INDEX IF NOT EXISTS idx_adm_audit_evento ON sgs_adm_auditoria_acceso (evento);
