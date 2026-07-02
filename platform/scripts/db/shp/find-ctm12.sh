#!/bin/bash
for epsg in 3114 3115 3116 3117 3118 3119 9377; do
  echo "=== EPSG:$epsg ==="
  gdalsrsinfo EPSG:$epsg 2>&1 | grep -E 'PROJCS|GEOGCS|GEOGCRS|PROJCRS' | head -2
done