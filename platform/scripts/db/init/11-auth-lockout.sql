-- =============================================================================
-- Auth lockout + cuenta inactiva (HU-AD-01 refuerzo, S1.A)
--
-- Agrega dos columnas a `sgs_adm_usuario` para soportar:
--   - `intentos_fallidos` — contador de logins fallidos consecutivos. Se resetea
--     a 0 cuando hay un login OK.
--   - `bloqueado_hasta` — timestamp hasta el cual el login es rechazado. NULL
--     significa "no bloqueado".
--
-- Reglas (implementadas en src/lib/auth.ts):
--   - Tras 5 intentos fallidos consecutivos, se setea
--     `bloqueado_hasta = now() + interval '15 minutes'`.
--   - En cada `authorize()` se chequea si `bloqueado_hasta > now()` ANTES de
--     comparar el password. Si está bloqueado, se rechaza sin incrementar el
--     contador (ya está al máximo) y se audita como ACCOUNT_LOCKED.
--   - En login OK, se resetean ambos campos a sus defaults.
--
-- Decisión de seguridad (no UX):
--   NO diferenciamos entre "email no existe" y "password mal" en el mensaje
--   al cliente — eso sería un oracle que permite enumerar usuarios. Para esos
--   dos casos, el cliente sigue viendo "Email o contraseña incorrectos".
--   SÍ diferenciamos "cuenta bloqueada" y "cuenta desactivada" porque no
--   revelan la existencia de la cuenta.
-- =============================================================================

ALTER TABLE sgs_adm_usuario
    ADD COLUMN IF NOT EXISTS intentos_fallidos SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bloqueado_hasta    TIMESTAMPTZ;

COMMENT ON COLUMN sgs_adm_usuario.intentos_fallidos IS
    'Contador de intentos fallidos consecutivos. Se resetea a 0 en login OK. '
    'Si llega a 5, se setea bloqueado_hasta = now() + 15 min.';

COMMENT ON COLUMN sgs_adm_usuario.bloqueado_hasta IS
    'Si > now(), el authorize() rechaza el login con ACCOUNT_LOCKED sin tocar '
    'el password. NULL = no bloqueado.';

-- -----------------------------------------------------------------------------
-- Índice parcial: solo filas bloqueadas (deberían ser raras). Acelera el
-- chequeo "está bloqueado?" en el WHERE del lookup de authorize.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_adm_usuario_bloqueado
    ON sgs_adm_usuario (bloqueado_hasta)
    WHERE bloqueado_hasta IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Backfill defensivo: si por alguna razón quedó un contador a 5 sin
-- bloqueado_hasta, lo bloqueamos 15 min para que el sistema se autorregule.
-- Solo aplica a filas con intentos_fallidos >= 5 que ya estaban así antes
-- de esta migración; no es idempotente respecto a re-ejecuciones donde las
-- filas ya están bloqueadas correctamente.
-- -----------------------------------------------------------------------------
UPDATE sgs_adm_usuario
   SET bloqueado_hasta = now() + interval '15 minutes'
 WHERE intentos_fallidos >= 5
   AND (bloqueado_hasta IS NULL OR bloqueado_hasta < now());
