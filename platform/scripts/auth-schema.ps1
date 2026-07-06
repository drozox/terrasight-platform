# =============================================================================
# Aplica SOLO el schema de auth (03-auth-schema.sql) sobre una BD existente.
# Útil porque `docker-entrypoint-initdb.d/` solo corre al CREAR el contenedor.
# =============================================================================

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)

$InitDir = Join-Path $ProjectRoot "scripts/db/init"
$SqlFile = Join-Path $InitDir "03-auth-schema.sql"

if (-not (Test-Path $SqlFile)) {
    Write-Error "No se encontró $SqlFile"
    exit 1
}

$PsqlCmd = @"
docker compose -f "$ProjectRoot/docker-compose.yml" exec -T db psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/03-auth-schema.sql
"@
Write-Host $PsqlCmd
Invoke-Expression $PsqlCmd
