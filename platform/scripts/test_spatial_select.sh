#!/usr/bin/env bash
# Test /api/analysis/spatial-select
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

echo "--- BBox GUATAVITA (-73.85,4.92,-73.81,4.94) ---"
curl -sS -b "$COOKIE_JAR" -X POST -H "Content-Type: application/json" \
  -d '{"minLng":-73.85,"minLat":4.92,"maxLng":-73.81,"maxLat":4.94}' \
  "$BASE/api/analysis/spatial-select" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('  bbox:',JSON.stringify(j.bbox));console.log('  area_km2:',j.area_km2);console.log('  results:',JSON.stringify(j.results));});"
rm "$COOKIE_JAR"
