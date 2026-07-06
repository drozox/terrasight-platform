# =============================================================================
# Aplica TODAS las migraciones posteriores a 01-schema.sql (los archivos
# numerados 02..NN) sobre una BD existente. Útil porque
# `docker-entrypoint-initdb.d/` solo corre al CREAR el contenedor.
#
# 02: datos de ejemplo
# 03: auth-schema (admin/usuarios/auditoria)
# 04: intervencion-estado
# Cualquier NN.sql futuro se puede agregar a esta lista manualmente.
# =============================================================================

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)

$InitDir = Join-Path $ProjectRoot "scripts/db/init"

$ordered = @(
    "02-datos-ejemplo.sql",
    "03-auth-schema.sql",
    "04-intervencion-estado.sql"
)

foreach ($file in $ordered) {
    $path = Join-Path $InitDir $file
    if (-not (Test-Path $path)) {
        Write-Warning "Saltando (no existe): $file"
        continue
    }
    $PsqlCmd = @"
docker compose -f "$ProjectRoot/docker-compose.yml" exec -T db psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/$file
"@
    Write-Host ""
    Write-Host "=== Aplicando $file ==="
    Write-Host $PsqlCmd
    Invoke-Expression $PsqlCmd
}
