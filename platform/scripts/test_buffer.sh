#!/usr/bin/env bash
# Test del endpoint /api/analysis/buffer con auth via curl
set -e
COOKIE_JAR=$(mktemp)
BASE="http://localhost:3000"

CSRF_JSON=$(curl -sS -c "$COOKIE_JAR" "$BASE/api/auth/csrf")
CSRF=$(echo "$CSRF_JSON" | sed -n 's/.*"csrfToken":"\([^"]*\).*/\1/p')

curl -sS -i -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "email=admin@sig-territorio.local" \
  --data-urlencode "password=AdminTest123!" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "callbackUrl=$BASE/" \
  --data-urlencode "json=true" \
  "$BASE/api/auth/callback/credentials" > /dev/null

for DIST in 200 1000 5000; do
  echo "--- Buffer ${DIST}m GUATAVITA ---"
  curl -sS -b "$COOKIE_JAR" -X POST -H "Content-Type: application/json" \
    -d "{\"geometry\":{\"type\":\"Point\",\"coordinates\":[-73.83,4.93]},\"distance\":${DIST}}" \
    "$BASE/api/analysis/buffer" \
    | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{const j=JSON.parse(d); console.log('  query:', JSON.stringify(j.query)); console.log('  buffer_area_ha:', j.buffer_area_ha); console.log('  results:', JSON.stringify(j.results)); console.log('  buffer coords count:', j.buffer.coordinates[0].length);});"
  echo ""
done

rm "$COOKIE_JAR"
