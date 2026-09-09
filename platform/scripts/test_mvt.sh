#!/usr/bin/env bash
# Test /api/tiles/[layer]/[z]/[x]/[y] — assumes bash (Git Bash / WSL)
# En Windows nativo, usar test_mvt.mjs (Node) o los tests unitarios.
set -e
COOKIE_JAR=$(mktemp)
BASE="http://localhost:3000"
CSRF=$(curl -sS -c "$COOKIE_JAR" "$BASE/api/auth/csrf" | sed -n 's/.*"csrfToken":"\([^"]*\).*/\1/p')
curl -sS -i -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "email=admin@sig-territorio.local" \
  --data-urlencode "password=AdminTest123!" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "callbackUrl=$BASE/" \
  --data-urlencode "json=true" \
  "$BASE/api/auth/callback/credentials" > /dev/null

echo "--- Tile drenajes z=10 x=300 y=500 (Cundinamarca) ---"
curl -sS -b "$COOKIE_JAR" -o /tmp/tile.mvt \
  -w "  Status: %{http_code}\n  Size: %{size_download} bytes\n  Type: %{content_type}\n" \
  "$BASE/api/tiles/drenajes/10/300/500"

echo "--- Tile municipios z=10 x=300 y=500 ---"
curl -sS -b "$COOKIE_JAR" -o /tmp/tile.mvt \
  -w "  Status: %{http_code}\n  Size: %{size_download} bytes\n" \
  "$BASE/api/tiles/municipios/10/300/500"

echo "--- Layer inválido (debe ser 404) ---"
curl -sS -b "$COOKIE_JAR" -o /tmp/tile.mvt \
  -w "  Status: %{http_code}\n" \
  "$BASE/api/tiles/no_existe/10/300/500"

echo "--- Coordenadas inválidas (debe ser 400) ---"
curl -sS -b "$COOKIE_JAR" -o /tmp/tile.mvt \
  -w "  Status: %{http_code}\n" \
  "$BASE/api/tiles/drenajes/10/9999/500"

rm "$COOKIE_JAR"
