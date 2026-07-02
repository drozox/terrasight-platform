# =============================================================================
# start-server.ps1 - Detached next start that survives bash tool exit.
# Strategy: invoke node.exe directly with the next CLI script. The node
# process is owned by Windows (no parent cmd), so it survives.
# =============================================================================

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Cleanup any leftover
$ports = @(3000, 3001, 3002, 3003)
foreach ($p in $ports) {
    Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
        try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop } catch {}
    }
}
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)" -ErrorAction SilentlyContinue).CommandLine
    if ($cmd -and $cmd -match "next.*start") {
        try { Stop-Process -Id $_.Id -Force -ErrorAction Stop } catch {}
    }
}
Start-Sleep 2

$nextBin = Join-Path $ProjectRoot "node_modules\next\dist\bin\next"
$logOut = Join-Path $env:TEMP "terra-start.log"
$logErr = Join-Path $env:TEMP "terra-start.err.log"
if (Test-Path $logOut) { Remove-Item -Path $logOut -Force }
if (Test-Path $logErr) { Remove-Item -Path $logErr -Force }

if (-not (Test-Path $nextBin)) {
    Write-Host "[-] next CLI not found at $nextBin"
    exit 1
}

# Spawn node.exe directly. Use Start-Process so we don't hold a parent handle.
$port = 3000
$argList = @($nextBin, "start", "-p", "$port")
$proc = Start-Process -FilePath "node.exe" `
                       -ArgumentList $argList `
                       -WorkingDirectory $ProjectRoot `
                       -RedirectStandardOutput $logOut `
                       -RedirectStandardError $logErr `
                       -WindowStyle Hidden `
                       -PassThru
Write-Host "Spawned node.exe PID=$($proc.Id) for next start on port $port"

# Poll port
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep 1
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Host "[+] Port $port LISTENING after ${i}s (node PID $($conn[0].OwningProcess))"
        $ready = $true
        break
    }
}

if (-not $ready) {
    Write-Host "[-] Port $port not listening after 30s"
    Write-Host "--- stdout ---"
    if (Test-Path $logOut) { Get-Content $logOut -Tail 20 | ForEach-Object { Write-Host ("  " + $_) } }
    Write-Host "--- stderr ---"
    if (Test-Path $logErr) { Get-Content $logErr -Tail 20 | ForEach-Object { Write-Host ("  E " + $_) } }
    exit 1
}

Write-Host "[OK] Server should now be reachable at http://localhost:$port"