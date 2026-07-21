# =============================================================================
# Aplica TODAS las migraciones posteriores a 01-schema.sql (los archivos
# numerados 02..NN) sobre una BD existente. Útil porque
# `docker-entrypoint-initdb.d/` solo corre al CREAR el contenedor.
#
# 02: datos de ejemplo
# 03: auth-schema (admin/usuarios/auditoria)
# 04: intervencion-estado
# 05: catalogos-unique
# 06: propuesta-avance
# 07: monitoreo-punto (HU-MO-01..03)
# 08: cat-secundarios (HU-TC-06..10: municipios, veredas, propietarios,
#     microcuencas, beneficiarios)
# 09: propuesta-avance-es-backfill (marca el backfill de la 06 para que las
#     queries de "último avance real" puedan filtrarlo).
# Cualquier NN.sql futuro se puede agregar a esta lista manualmente.
# =============================================================================

$ErrorActionPreference = "Stop"

# DEBT-2: $MyInvocation.MyCommand.Path devuelve $null cuando se invoca
# desde npm (`npm run db:migrate`). $PSScriptRoot y $PSCommandPath son
# automáticas de PowerShell (>=3.0) y siempre apuntan al script actual.
# NOTA: el script vive en `platform/scripts/`, no en `platform/scripts/db/`.
#       Antes hacía `Split-Path -Parent` dos veces, lo cual era incorrecto.
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } elseif ($PSCommandPath) { Split-Path -Parent $PSCommandPath } else { throw "No se pudo determinar el directorio del script. Use PowerShell 3.0+ o ejecute con la ruta completa." }
$ProjectRoot = Split-Path -Parent $ScriptDir

$InitDir = Join-Path $ProjectRoot "scripts/db/init"
if (-not (Test-Path $InitDir)) {
    throw "Directorio de migrations no encontrado: $InitDir (ScriptDir='$ScriptDir', ProjectRoot='$ProjectRoot')"
}

$ordered = @(
    "02-datos-ejemplo.sql",
    "03-auth-schema.sql",
    "04-intervencion-estado.sql",
    "05-catalogos-unique.sql",
    "06-propuesta-avance.sql",
    "07-monitoreo-punto.sql",
    "08-cat-secundarios.sql",
    "09-propuesta-avance-es-backfill.sql",
    "10-sgs-amb-alerta.sql"
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
