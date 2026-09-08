#!/usr/bin/env bash
# Test del endpoint /api/geo/identify con auth via curl
set -e
COOKIE_JAR=$(mktemp)
BASE="http://localhost:3000"

# 1) CSRF
CSRF_JSON=$(curl -sS -c "$COOKIE_JAR" "$BASE/api/auth/csrf")
# Parsear JSON sin grep -P (no funciona en Git Bash Windows)
CSRF=$(echo "$CSRF_JSON" | sed -n 's/.*"csrfToken":"\([^"]*\).*/\1/p')
echo "CSRF: ${CSRF:0:20}..."

# 2) Login
echo "--- Login ---"
curl -sS -i -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "email=admin@sig-territorio.local" \
  --data-urlencode "password=AdminTest123!" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "callbackUrl=$BASE/" \
  --data-urlencode "json=true" \
  "$BASE/api/auth/callback/credentials" | head -3

# 3) Identify
echo ""
echo "--- Identify ---"
curl -sS -b "$COOKIE_JAR" \
  "$BASE/api/geo/identify?lng=-73.83&lat=4.93&tol=200&limit=10"

rm "$COOKIE_JAR"
