# =============================================================================
# Carga el seed manualmente (útil si la BD ya existe y quieres reiniciar datos).
# PowerShell. Requiere psql disponible (lo trae Docker Desktop o instalable).
# =============================================================================

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)

$InitDir = Join-Path $ProjectRoot "scripts/db/init"
$SqlFile = Join-Path $InitDir "01-schema.sql"

if (-not (Test-Path $SqlFile)) {
    Write-Error "No se encontró $SqlFile"
    exit 1
}

# Ejecuta psql dentro del contenedor
$PsqlCmd = @"
docker compose -f "$ProjectRoot/docker-compose.yml" exec -T db psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/01-schema.sql
"@
Write-Host $PsqlCmd
Invoke-Expression $PsqlCmd
