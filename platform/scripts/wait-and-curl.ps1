# =============================================================================
# wait-and-curl.ps1 - Wait for server and probe routes
# =============================================================================

$ErrorActionPreference = "Continue"
$logOut = Join-Path $env:TEMP "terra-start.log"

$ready = $false
Write-Host "Esperando http://localhost:3000 ..."
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep 1
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host ("[+] HTTP {0} despues de {1}s ({2} bytes)" -f $r.StatusCode, $i, $r.Content.Length)
        $tmpHtml = Join-Path $env:TEMP "terra-home.html"
        [IO.File]::WriteAllText($tmpHtml, $r.Content, [Text.Encoding]::UTF8)
        Write-Host "[+] HTML guardado en $tmpHtml"
        $ready = $true
        break
    } catch {
        if ($i % 5 -eq 0) { Write-Host ("  ... aun esperando ({0}s)" -f $i) }
    }
}

if (-not $ready) {
    Write-Host "[-] Server no respondio en 40s. Logs:"
    if (Test-Path $logOut) { Get-Content $logOut | Select-Object -Last 30 | ForEach-Object { Write-Host ("  " + $_) } }
    exit 1
}

foreach ($route in "/mapa", "/predios", "/reportes") {
    try {
        $r = Invoke-WebRequest -Uri ("http://localhost:3000" + $route) -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        Write-Host ("[+] {0} -> HTTP {1} ({2} bytes)" -f $route, $r.StatusCode, $r.Content.Length)
    } catch {
        Write-Host ("[-] {0} -> ERROR" -f $route)
    }
}