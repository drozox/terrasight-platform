#!/usr/bin/env bash
# =============================================================================
# ci-migrate.sh — Aplica las migrations de la BD en CI.
#
# Asume:
#   - Postgres reachable en $POSTGRES_HOST:$POSTGRES_PORT con $POSTGRES_USER
#     y la BD $POSTGRES_DB ya creada por el servicio de GitHub Actions.
#   - `psql` instalado (paso previo del workflow: `apt-get install postgresql-client`).
#   - Las env vars de conexión exportadas.
#
# Diferencias con `scripts/db-migrate.ps1` (Windows local):
#   - NO depende de docker compose (estamos corriendo sobre el servicio
#     postgres del job, no en un sidecar).
#   - NO corre 00-truncate.sql (destructivo; sólo se usa en db:reset local).
#   - Usa `set -euo pipefail` para que cualquier error aborte el job.
# =============================================================================

set -euo pipefail

# Sanity-check de las env vars críticas.
: "${POSTGRES_HOST:?POSTGRES_HOST requerido}"
: "${POSTGRES_PORT:?POSTGRES_PORT requerido}"
: "${POSTGRES_USER:?POSTGRES_USER requerido}"
: "${POSTGRES_DB:?POSTGRES_DB requerido}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD requerido}"

# Ruta al directorio de migrations. El script vive en scripts/, init/ es sibling.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INIT_DIR="${SCRIPT_DIR}/db/init"

if [[ ! -d "$INIT_DIR" ]]; then
  echo "ERROR: no existe ${INIT_DIR}" >&2
  exit 1
fi

# Orden de aplicación. Si agregás un NN.sql nuevo, sumalo al final y bumpeá
# el comentario de cabecera. NO incluyas 00-truncate.sql (es destructivo).
MIGRATIONS=(
  "01-schema.sql"
  "02-datos-ejemplo.sql"
  "03-auth-schema.sql"
  "04-intervencion-estado.sql"
  "05-catalogos-unique.sql"
  "06-propuesta-avance.sql"
  "07-monitoreo-punto.sql"
)

# Espera a que Postgres acepte conexiones (el service del job suele estar
# listo antes de que este step corra, pero por las dudas).
echo "Esperando a Postgres en ${POSTGRES_HOST}:${POSTGRES_PORT}…"
for i in {1..30}; do
  if PGPASSWORD="$POSTGRES_PASSWORD" psql \
       -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
       -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
       -c "SELECT 1" >/dev/null 2>&1; then
    echo "  Postgres OK (intento $i)."
    break
  fi
  if [[ $i -eq 30 ]]; then
    echo "ERROR: Postgres no responde tras 30 intentos." >&2
    exit 1
  fi
  sleep 2
done

# Aplica cada migration en orden. -v ON_ERROR_STOP=1 aborta en el primer error
# (sin esto, psql sigue aplicando el resto del archivo y el CI no se entera).
for file in "${MIGRATIONS[@]}"; do
  path="${INIT_DIR}/${file}"
  if [[ ! -f "$path" ]]; then
    echo "WARN: saltando ${file} (no existe)" >&2
    continue
  fi
  echo ""
  echo "=== Aplicando ${file} ==="
  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 \
    -f "$path"
done

echo ""
echo "Migrations aplicadas OK."
