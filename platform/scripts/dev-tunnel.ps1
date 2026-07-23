# =============================================================================
# dev-tunnel.ps1 — Arranca cloudflared + actualiza NEXTAUTH_URL + reinicia dev.
#
# Por qué: con `NEXTAUTH_URL=http://localhost:3001`, los redirects de NextAuth
# apuntan a loopback. Cuando el reviewer entra por un origen público
# (trycloudflare.com), el browser bloquea con CORS-RFC1918 / Private Network
# Access: "loopback access denied". Fix: NEXTAUTH_URL debe ser la URL pública
# del tunnel.
#
# Uso:
#   pwsh -File scripts/dev-tunnel.ps1           # tunnel nuevo + dev server
#   pwsh -File scripts/dev-tunnel.ps1 -KeepOld  # no mata cloudflared previos
#   pwsh -File scripts/dev-tunnel.ps1 -OnlyEnv  # solo actualiza NEXTAUTH_URL
#
# Requiere: cloudflared.exe en C:\Users\agFab\AppData\Local\cloudflared\
# =============================================================================

param(
  [switch]$KeepOld = $false,
  [switch]$OnlyEnv = $false
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$cfExe = "$env:LOCALAPPDATA\cloudflared\cloudflared.exe"
$cfUrl = ""
$envFile = Join-Path $root ".env"

# -----------------------------------------------------------------------------
# 1. Levantar cloudflared
# -----------------------------------------------------------------------------
if (-not $OnlyEnv) {
  if (-not (Test-Path $cfExe)) {
    throw "cloudflared no encontrado en $cfExe. Descargá desde https://github.com/cloudflare/cloudflared/releases"
  }
  if (-not $KeepOld) {
    Write-Host "[1/4] Cerrando tunnels previos..."
    Get-Process -Name cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }

  Write-Host "[2/4] Lanzando cloudflared (tunnel efímero)..."
  $logPath = Join-Path $root "cloudflared.log"
  $errPath = Join-Path $root "cloudflared.err"
  if (Test-Path $logPath) { Remove-Item $logPath }
  if (Test-Path $errPath) { Remove-Item $errPath }
  $cfProc = Start-Process -FilePath $cfExe `
    -ArgumentList "tunnel", "--url", "http://localhost:3001", "--no-autoupdate" `
    -RedirectStandardOutput $logPath `
    -RedirectStandardError $errPath `
    -PassThru -NoNewWindow
  Write-Host "       cloudflared PID $($cfProc.Id), log: $logPath"

  Write-Host "[3/4] Esperando URL público (timeout 30s)..."
  # cloudflared v2026.7+ manda los INF logs a stderr (no stdout).
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    $line = $null
    if (Test-Path $errPath) {
      $line = Select-String -Path $errPath -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
    }
    if (-not $line -and (Test-Path $logPath)) {
      $line = Select-String -Path $logPath -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
    }
    if ($line) {
      $cfUrl = ($line.Matches[0].Value).TrimEnd('.')
      break
    }
  }
  if (-not $cfUrl) {
    throw "No se pudo obtener URL público. Revisá cloudflared.log"
  }
  Write-Host "       URL: $cfUrl"
} else {
  Write-Host "[1/3] -OnlyEnv: saltando cloudflared. Pegá la URL:"
  $cfUrl = Read-Host "       NEXTAUTH_URL"
  if (-not $cfUrl) { throw "URL requerida" }
}

# -----------------------------------------------------------------------------
# 2. Actualizar .env
# -----------------------------------------------------------------------------
$stepEnv = if ($OnlyEnv) { '2' } else { '4' }
Write-Host "[$stepEnv/4] Actualizando NEXTAUTH_URL en .env..."
if (-not (Test-Path $envFile)) { throw ".env no encontrado en $envFile" }
$content = Get-Content $envFile -Raw
$newLine = "NEXTAUTH_URL=$cfUrl"
if ($content -match '(?m)^NEXTAUTH_URL=.*$') {
  $content = $content -replace '(?m)^NEXTAUTH_URL=.*$', $newLine
} else {
  $content += "`n$newLine`n"
}
Set-Content $envFile $content -NoNewline
Write-Host "       .env: $newLine"

# -----------------------------------------------------------------------------
# 3. Reiniciar dev server
# -----------------------------------------------------------------------------
if (-not $OnlyEnv) {
  $stepDev = if ($OnlyEnv) { '3' } else { '4' }
  Write-Host "[$stepDev/4] Reiniciando next dev en :3001..."
  Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -eq "" -and $_.StartTime -gt (Get-Date).AddHours(-2)
  } | ForEach-Object {
    try {
      $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
      if ($cmd -match "next.*dev.*3001") {
        Write-Host "       Stopping next dev PID $($_.Id)"
        Stop-Process -Id $_.Id -Force
      }
    } catch { }
  }
  Start-Sleep -Seconds 2

  $devLog = Join-Path $root "dev-server.log"
  $devProc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npx next dev -p 3001 > `"$devLog`" 2>&1" `
    -PassThru -NoNewWindow
  Write-Host "       next dev PID $($devProc.Id), log: $devLog"

  Write-Host "       Esperando ready..."
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
      $test = Invoke-WebRequest -Uri "http://localhost:3001/login" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
      if ($test.StatusCode -eq 200) {
        Write-Host "       Ready after $((2*($i+1)))s"
        break
      }
    } catch { }
  }
}

Write-Host ""
Write-Host "==================================================================="
Write-Host " Listo. URL para el reviewer:"
Write-Host "   $cfUrl"
Write-Host "==================================================================="
Write-Host " Credenciales:  admin@car.gov.co  /  Admin123!"
Write-Host " Logs:"
Write-Host "   cloudflared:  $root\cloudflared.log"
Write-Host "   next dev:     $root\dev-server.log"
Write-Host "==================================================================="
