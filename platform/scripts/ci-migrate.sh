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

# Orden de aplicación: TODAS las migraciones NN-*.sql de db/init en orden
# lexicográfico (los archivos están zero-padded: 01, 02, … 36). Así una
# migración nueva se incluye automáticamente sin editar este script.
# Se excluye `00-truncate.sql` (destructivo, solo db:reset local).
#
# Historial: hasta Sprint 23 este array estaba hardcodeado con solo 01..07,
# por lo que el CI testeaba un esquema incompleto (sin unaccent, workflow,
# indicadores, búsqueda, etc.). Corregido en FINAL-CLOSURE-PLAN.
MIGRATIONS=()
while IFS= read -r f; do
  base="$(basename "$f")"
  [[ "$base" == "00-truncate.sql" ]] && continue
  MIGRATIONS+=("$base")
done < <(find "$INIT_DIR" -maxdepth 1 -name '*.sql' | sort)

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

  # 01-schema.sql incluye una sección "DATOS DE PRUEBA (Ejemplo)" que
  # 02-datos-ejemplo.sql (versión ampliada) también cubre. La quitamos para no
  # duplicar filas y no chocar con los UNIQUE de migraciones posteriores
  # (mismo criterio que `migrate.mjs --no-seed` en producción).
  if [[ "$file" == "01-schema.sql" ]]; then
    stripped="$(mktemp)"
    awk '
      index($0, "-- DATOS DE PRUEBA (Ejemplo)") > 0 { skip=1 }
      index($0, "-- FIN DEL SCRIPT") > 0           { skip=0 }
      !skip                                        { print }
    ' "$path" > "$stripped"
    path="$stripped"
  fi

  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 \
    -f "$path"
done

echo ""
echo "Migrations aplicadas OK."
