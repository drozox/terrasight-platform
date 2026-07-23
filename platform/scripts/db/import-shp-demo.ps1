# =============================================================================
# DEBT-3.6 — Wrapper PowerShell para re-importar geografía desde SHPs.
#
# Uso:
#   powershell -File scripts/db/import-shp-demo.ps1
#
# Comportamiento:
#   1. Busca todos los SHP en DOCS/6. Script SQL (Implementación)/Datos prueba/
#   2. Los copia al container Docker
#   3. Ejecuta el script bash dentro del container
# =============================================================================

$ErrorActionPreference = "Stop"

# 1. Localizar los SHPs
$shpDir = Join-Path $PSScriptRoot "..\..\..\DOCS\6. Script SQL (Implementación)\Datos prueba\Datos_Prueba\Datos_Prueba"
$shpDir = (Resolve-Path $shpDir).Path
Write-Host "SHP dir: $shpDir"

# 2. Crear el dir en el container
docker exec terrasight-db mkdir -p /tmp/shps | Out-Null

# 3. Copiar todos los archivos de SHP
Get-ChildItem $shpDir -File | ForEach-Object {
  Write-Host "  cp $($_.Name)"
  docker cp $_.FullName "terrasight-db:/tmp/shps/$($_.Name)" 2>&1 | Out-Null
}

# 4. Copiar y ejecutar el bash
$bashScript = Join-Path $PSScriptRoot "import-shp-demo.sh"
docker cp $bashScript terrasight-db:/tmp/import-shp-demo.sh | Out-Null
Write-Host ""
Write-Host "=== Ejecutando import en el container ==="
docker exec -i terrasight-db bash /tmp/import-shp-demo.sh
