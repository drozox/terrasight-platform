# PLAN DE MEJORAS — Mapa / Dashboard / Predios (2026-09-13)

> Revisiones hechas contra el código y la BD real. **NO se ejecutó nada aún** (según lo pedido).

---

## 1. Hallazgos

### 🔴 F1 (P0) — `/intervenciones/[id]` crashea para líneas y polígonos
**Evidencia:**
- `ST_GeometryType` en la BD: propuestas son **todas Multi*** → `MultiLineString` (450), `MultiPolygon` (239), `MultiPoint` (692).
- `/intervenciones/693` es una **línea** (`Cerco vivo`) → su GeoJSON es `MultiLineString`.
- `src/app/intervenciones/[id]/mapa-mini.tsx` → `computeCentroid()` / `centroidOfCoords()` asumen `LineString`/`Polygon` (coordinates planas). Con Multi*, `coordinates` viene anidado (`[[[lon,lat],…]]`) → el destructuring `[lon,lat]` obtiene **arrays**, el centroide da **NaN**, y Leaflet lanza **"Invalid LatLng object"**.
- Afecta a **689 propuestas** (líneas + polígonos). Los puntos se salvan (usan `este/norte`).

**Causa raíz:** tipos `GeoJSONLineString`/`GeoJSONPolygon` + cálculo de centroide sin soporte `Multi*`.
**Fix:** aplanar coordenadas (`Multi*`) o usar `@turf/turf` (`bbox`) + guardar contra NaN. Actualizar tipos a `Multi*`.

### 🟠 F2 (P1) — La leyenda no representa la simbología de las capas
`src/components/map/map-legend.tsx` solo lista **componentes C1/C2/C3** (puntos de color) + "Fuente hídrica". No muestra la simbología real de las capas (predios, quebradas, vías, municipios, veredas, biomas, intervenciones punto/línea/área) con sus colores/estilos. Además no está sincronizada con las capas activas ni colapsa.
**Fix:** reescribir la leyenda para que liste **solo las capas activas** con su color/estilo (línea/polígono/punto) + contador, colapsable.

### 🟠 F3 (P1) — Click en entidad del mapa NO es una herramienta SIG
`GeoJsonLayer` (`geojson-layer.tsx`) solo bindea un **popup** con 2-3 campos. No hay panel de **atributos completo** al hacer click en una entidad, ni resaltado, ni link a la ficha.
**Fix:** al click en una feature → abrir un **panel de atributos** (todos los campos) con enlace a predio/intervención. (Ya existe base en `map-layer-data-panel.tsx` y `map-identify-panel.tsx`.)

### 🟠 F4 (P1) — Ficha de predio `/predios/[id]` muy pobre
`predio-detail.tsx` muestra ~9 campos y un aside "Próximas funciones: visualización del polígono en mapa, historial de intervenciones, carga de documentos legales". **No** hay: mapa del predio, intervenciones relacionadas, ni datos Fase 6 (cobertura, bioma, páramo, POMCA, RFP, indicadores).
**Fix:** agregar mapa del polígono + **intervenciones del predio** + **datos ambientales (Fase 6)** usando repos ya existentes (`getPredioAnalisisCompleto`, `getCoberturaByPredio`, `getBiomaByPredio`, `getParamoByPredio`, `getPomcaByPredio`, `getRfpByPredio`, `getIntervencionCompleta`, etc.).

### 🟡 F5 (P2) — Dashboard poco interactivo
El home muestra KPIs + metas + mapa + tablas, pero **sin interacción**: los KPIs no son clickeables, no filtran, no hay drill-through. El strip de metas sí linkea.
**Fix:** KPIs clickeables (→ vistas filtradas), tarjetas de metas clickeables por indicador, secciones con "ver más", y filtro por componente coherente.

### 🟡 F6 (P3) — Identify sin acción sobre el resultado
`map-identify-panel.tsx` comenta "Click en un item resalta la feature en el mapa (futuro)" — no implementado. **Fix:** al click, centrar/resaltar la feature y ofrecer "Ver ficha".

---

## 2. Plan de ejecución (orden sugerido)

| Orden | Tarea | Dueño | Archivos | Prioridad |
|---|---|---|---|---|
| 1 | **F1** Fix Multi* en mini-mapa + tipos | T0 | `mapa-mini.tsx`, `lib/types.ts` | P0 |
| 2 | **F2** Leyenda por capas (simbología real) | T1 | `map-legend.tsx`, `map-client.tsx` | P1 |
| 3 | **F3** Click entidad → panel de atributos | T0 | `geojson-layer.tsx`, `map-client.tsx`, nuevo `map-feature-panel.tsx` | P1 |
| 4 | **F4** Ficha de predio enriquecida (mapa + intervenciones + Fase 6) | T1 | `predios/[id]/page.tsx`, `predio-detail.tsx`, nuevo mapa-mini de predio | P1 |
| 5 | **F5** Dashboard interactivo | T1 | `page.tsx`, `dashboard-suspense.tsx`, componentes dashboard | P2 |
| 6 | **F6** Identify: resaltar + ficha | T1 | `map-identify-panel.tsx`, `map-client.tsx` | P3 |

**Paralelizables:** F2 y F4 (archivos disjuntos). F1 y F3 tocan el mapa → secuenciales entre sí.
**Nota:** F1 es bug crítico; va primero y solo (para no chocar con F2/F3 en el mapa).

---

## 3. Criterios de aceptación

- **F1**: `/intervenciones/{id}` de una **línea** (693) y un **polígono** renderiza el mini-mapa sin error; centroide dentro de Cundinamarca; `tsc` 0 errors; test unitario del cálculo de centroide con `MultiLineString`/`MultiPolygon`.
- **F2**: la leyenda muestra las capas activas con su color/estilo y se actualiza al togglear; colapsable.
- **F3**: click en una entidad abre un panel con **todos** sus atributos + link a ficha (predio/intervención).
- **F4**: la ficha de predio muestra el **polígono en mapa**, la lista de **intervenciones del predio** y las secciones ambientales (cobertura/bioma/páramo/POMCA/RFP).
- **F5**: KPIs y metas son clickeables y llevan a la vista correspondiente (filtrada); el dashboard refleja las 5 metas.
- **F6**: click en un resultado de Identify centra/resalta la feature y enlaza a la ficha.

---

## 4. Notas
- La app deployada en `terrasight-platform.vercel.app` puede estar en un commit previo; el bug F1 es **preexistente** (viene de DEBT-3.8), así que se reproduce con el código actual.
- `@turf/turf` ya es dependencia (útil para F1).
