# =============================================================================
# Setup de primera corrida (o reset completo) para TerraSight.
#
#   cd platform
#   powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
#   # o, mas limpio:
#   npm run setup
#
# Pasos:
#   1. Copia .env.example -> .env si .env no existe.
#      Si .env existe pero le falta NEXTAUTH_SECRET, lo regenera y avisa.
#   2. Levanta el contenedor Postgres/PostGIS (docker compose up -d db).
#   3. Espera a que la BD acepte conexiones.
#   4. Aplica el schema base (db:migrate) -> tablas del modelo BDG.
#   5. Aplica el schema de auth (db:auth-schema) -> sgs_adm_*.
#   6. Carga los datos demo (db:seed) -> modelo BDG + beneficiarios.
#   7. Crea el primer admin (auth:create-admin) si no existe ninguno.
#
# Reentrante: si .env ya existe, no lo pisa. Si la BD ya tiene admin, no
# duplica. Idempotente para correr varias veces.
# =============================================================================

#$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path "$PSScriptRoot/.." | Select-Object -ExpandProperty Path
Set-Location $ProjectRoot

function Step($msg) { Write-Host "
==> $msg" -ForegroundColor Cyan }
function Warn($msg)  { Write-Host "    !  $msg" -ForegroundColor Yellow }
function Ok($msg)    { Write-Host "    +  $msg" -ForegroundColor Green }

# -----------------------------------------------------------------------------
# 1. .env
# -----------------------------------------------------------------------------
Step "Paso 1/7 -- preparar .env"

$envPath = Join-Path $ProjectRoot ".env"
$envExample = Join-Path $ProjectRoot ".env.example"

if (-not (Test-Path $envPath)) {
    if (-not (Test-Path $envExample)) {
        throw "No se encontro .env ni .env.example. Estas en $ProjectRoot?"
    }
    Copy-Item $envExample $envPath
    Ok "Creado .env desde .env.example"
}
else {
    Ok ".env ya existe, lo dejo como esta"
}

# Detectar NEXTAUTH_SECRET sin valor real (placeholder) o vacio.
$envContent = Get-Content $envPath -Raw
$needsSecret = $false
if ($envContent -notmatch '^NEXTAUTH_SECRET=.+$' -or $envContent -match 'cambia-esto') {
    $needsSecret = $true
}
if ($needsSecret) {
    Warn "NEXTAUTH_SECRET esta como placeholder. Regenerando..."
    $secret = node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))"
    # Reemplaza la linea NEXTAUTH_SECRET=... (con o sin valor), reescribiendo en UTF-8 sin BOM.
    $lines = Get-Content $envPath
    $newLines = $lines | ForEach-Object {
        if ($_ -match '^NEXTAUTH_SECRET=') { "NEXTAUTH_SECRET=$secret" } else { $_ }
    }
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($envPath, ($newLines -join "
") + "
", $utf8NoBom)
    Ok ("NEXTAUTH_SECRET regenerado (longitud " + $secret.Length + ")")
}
else {
    Ok "NEXTAUTH_SECRET presente, OK"
}

# -----------------------------------------------------------------------------
# 2. Levantar Postgres
# -----------------------------------------------------------------------------
Step "Paso 2/7 -- levantar Postgres/PostGIS"
& npm run db:up

# -----------------------------------------------------------------------------
# 3. Esperar a que la BD responda
# -----------------------------------------------------------------------------
Step "Paso 3/7 -- esperar a que la BD este lista"
$maxWaitSec = 60
$elapsed = 0
while ($elapsed -lt $maxWaitSec) {
    $probe = docker exec terrasight-db pg_isready -U terrasight 2>&1
    if ($LASTEXITCODE -eq 0) { Ok "BD responde"; break }
    Start-Sleep -Seconds 2
    $elapsed += 2
    Write-Host ("    ... esperando (" + $elapsed + "s)")
}
if ($elapsed -ge $maxWaitSec) {
    throw ("BD no respondio pg_isready en " + $maxWaitSec + "s. Revisa 'npm run db:logs'.")
}

# -----------------------------------------------------------------------------
# 4. Schema base
# -----------------------------------------------------------------------------
Step "Paso 4/7 -- schema del modelo BDG"
& npm run db:migrate

# -----------------------------------------------------------------------------
# 5. Schema de auth (tablas sgs_adm_*, NO confundir con sgs_pre_usuario)
# -----------------------------------------------------------------------------
Step "Paso 5/7 -- schema de auth (sgs_adm_usuario, sgs_adm_rol, auditoria)"
& npm run db:auth-schema

# -----------------------------------------------------------------------------
# 6. Datos demo
# -----------------------------------------------------------------------------
Step "Paso 6/7 -- datos demo"
& npm run db:seed

# -----------------------------------------------------------------------------
# 7. Primer admin
# -----------------------------------------------------------------------------
Step "Paso 7/7 -- primer admin"

# Si ya hay al menos un admin activo, no crear otro.
$existing = docker exec terrasight-db psql -U terrasight -d convenio_car_wwf -t -A -c "SELECT COUNT(*) FROM sgs_adm_usuario u JOIN sgs_adm_rol r ON r.id_rol=u.id_rol WHERE r.nombre='ADMIN' AND u.activo=TRUE;" 2>&1
if ($existing -and $existing.Trim() -gt 0) {
    Ok ("Ya existe(n) " + $existing.Trim() + " admin(s) activo(s). Salto este paso.")
    Warn "Si queres crear otro, corre:  npm run auth:create-admin -- --email ... --password ..."
}
else {
    $email = Read-Host "Email del admin [admin@car.gov.co]"
    if (-not $email) { $email = "admin@car.gov.co" }
    $nombre = Read-Host "Nombre completo [Ana Maria]"
    if (-not $nombre) { $nombre = "Ana Maria" }
    $password = Read-Host "Password (>=8 chars) [Secreta123!]" -AsSecureString
    $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    )
    if (-not $passwordPlain) { $passwordPlain = "Secreta123!" }

    & node scripts/create-admin.mjs --email $email --nombre "$nombre" --password "$passwordPlain" --rol ADMIN
    Ok ("Admin " + $email + " creado. Ya podes iniciar sesion en /login")
}

Write-Host ""
Ok "Setup completo. Para arrancar el server:  npm run dev (default :3000, o -- -p 3001 si AFM esta en :3000)"