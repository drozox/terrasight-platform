# SEPARACIÓN T0 (complejo) vs T1 (acotado) — TerraSight

> Regla: **T0 (DeepSeek)** = problemas difíciles/cross-cutting/riesgo. **T1 (MiniMax)** =
> tareas acotadas, de 1 archivo/dominio, verificables con `tsc + test`.
> Los puntos reservados a T0 NO se delegan (ver §4).

---

## 1. Problemas complejos → T0 (los hago yo)

### C1 · Modelo de geometría `Multi*` end-to-end (correctitud, cross-cutting)
- **Por qué es difícil:** la BD usa `MultiPoint/MultiLineString/MultiPolygon`, pero varios
  tipos y componentes asumen geometría simple (`GeoJSONLineString`, `GeoJSONPolygon`).
  El crash de `/intervenciones/[id]` (F1) fue un síntoma. Unificar toca: `lib/types.ts`,
  `repos/propuestas.ts` (`parseGeoJSON`), `mapa-mini.tsx`, `intervencion-detail.tsx`,
  `reportes.ts` (R4). Riesgo de regresión en varios puntos.
- **Estado:** el crash ya se arregló (F1). Falta unificar los **tipos** y revisar los
  consumidores restantes.

### C2 · Catálogo cerrado de actividades (semántica de negocio)
- **Por qué es difícil:** hoy los indicadores se calculan por **fuzzy `ILIKE`** sobre
  `actividad` (texto libre). Reemplazar por catálogo + FK implica: decisión del **owner**
  sobre la lista canónica, **migración** (tabla + backfill de 1.381 propuestas por
  mapeo/regex), y actualizar la **fuente única** (`sgs_v_indicador_*`, migración 36) y
  `metas-convenio.ts`. Alto impacto, requiere datos.
- **Bloqueo:** lista canónica (owner).

### C3 · Integridad de datos GDB → Supabase (data engineering)
- **Por qué es difícil:** el import perdió la geometría de los puntos (ya arreglado) y hay
  desajustes de atributos (`tipo_obra` difiere en 96 filas). Requiere GDAL/`ogrinfo`
  contra la GDB local, comparar capa por capa (conteos, campos, SRID, geometría) y dejar
  el pipeline **reproducible**. Alto riesgo si se toca mal.
- **Herramientas:** `C:\Program Files\QGIS 3.40.7\bin\ogrinfo.exe`, `ogr2ogr.exe`.

### C4 · Rendimiento GIS (payload/queries)
- **Por qué es difícil:** capas grandes (vías 17,877; quebradas 656; drenajes 1,260).
  MVT hoy cubre 6 capas; el resto va por GeoJSON (`/api/geo`, cache 300s) y puede pesar.
  Requiere decidir qué capa va a MVT, simplificación (`ST_Simplify`), índices GIST y
  límites. Afecta a `/mapa`, dashboard y `/analisis` (fusionado).

### C5 · Mapa: leyenda (F2) + Identify (F6)
- **Por qué es difícil (para T1):** la leyenda debe reflejar la **simbología real de cada
  capa activa** (color/estilo/tipo) y sincronizarse con el estado del mapa; F6 necesita
  **resaltar** la feature + `fitBounds` + abrir ficha. Ambos tocan `map-client.tsx`
  (donde T0 ya está trabajando).
- **Reservado a T0** por contención de archivos.

### C6 · Integración/CI/Release real
- **gate** con `DATABASE_URL` real (smoke + reconciliación), e2e, preparación de deploy y
  verificación post-release. Cross-cutting (infra).

---

## 2. Tareas acotadas → T1 (MiniMax)

| Tarea | Por qué es acotada |
|---|---|
| **F5 Dashboard interactivo** | solo links + estilos en componentes dashboard (1 dominio). |
| Tests de integración/e2e/unit/component | 1 archivo, patrón existente. |
| Docs (ALCANCE, PLAN, RUNBOOK) | 1-2 archivos. |
| Cambios de campo/estilo puntuales | 1 archivo. |

---

## 3. Ajuste del lote 08 (en curso)
- **F4 (ficha de predio con mapa + Fase 6)** se saca de MiniMax → **T0**. Es la card más
  compleja del lote (nuevo mapa + joins Fase 6 + posible repo nuevo) y toca dominio sensible.
- MiniMax queda con: **F5 (dashboard)** + **tests predios (integración/e2e)**.

---

## 4. Reservado a T0 (no delegar)
`map-client.tsx`, `geojson-layer.tsx`, `map-legend.tsx`, `mapa-mini.tsx`, `map-feature-panel.tsx`,
`map-layer-data-panel.tsx`, `src/lib/repos/metas-convenio.ts`, `geojson.ts`, `analisis.ts`,
`api/geo/*`, `scripts/db/init/*`, `scripts/prod_smoke.mjs`, `src/lib/auth*.ts`.

---

## 5. Orden sugerido (T0)
1. **C3** auditoría de integridad GDB + fix `tipo_obra` (dato correcto = objetivo OE2).
2. **C1** unificar tipos `Multi*`.
3. **F4** ficha de predio (movida de MiniMax).
4. **C5** leyenda (F2) + Identify (F6).
5. **C4** rendimiento GIS.
6. **C2** catálogo de actividades (cuando el owner defina la lista).
7. **C6** release real.
