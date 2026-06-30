# =============================================================================
# Abre un psql interactivo dentro del contenedor
# =============================================================================

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

docker compose -f "$ProjectRoot/docker-compose.yml" exec db psql -U terrasight -d convenio_car_wwf
