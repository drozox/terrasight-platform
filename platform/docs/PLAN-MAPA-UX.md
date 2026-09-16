# Plan de mejora UX/UI del Mapa — SIG TERRITORIO

Objetivo: que el mapa **cuente la historia** del convenio igual que el dashboard,
con una UI más limpia, interactiva y accesible.

## Problema actual
- **Muchas cajas flotantes** simultáneas: `MapLayersPanel` (capas+basemap),
  `MapLegend`, `MapLayerDataPanel`, `MapFeaturePanel`, `MapTools`,
  `MapToolFeedback`, `MapResultPanel`, `MapIdentifyPanel`, `MapBufferPanel`,
  `MapSpatialSelectPanel`, `MapCompass`. Compiten por el espacio y se solapan.
- No hay **resaltado de la capa activa** ni **readout** de coordenadas/escala.
- **Clustering** ausente: C2 tiene 433 puntos; C3 433 → el mapa se satura.
- **Accesibilidad**: controles Leaflet y herramientas sin teclado/`aria-label`.

## Fases

### M1 — Panel único (dock) · ALTA
- Consolidar **Capas + Leyenda + Datos** en un solo contenedor con secciones
  (o pestañas). Eliminar `MapLegend` y `MapLayerDataPanel` como cajas sueltas.
- Archivos: `map-client.tsx`, `map-layers-panel.tsx`, `map-legend.tsx`,
  `map-layer-data-panel.tsx`, nuevo `map-dock.tsx`.
- AC: una sola caja a la izquierda con las 3 secciones; el resto del mapa libre.

### M2 — Resaltado de capa activa · MEDIA
- Al enfocar/hover una capa en el dock, resaltarla en el mapa y **atenuar** las
  demás (opacidad). Al hacer click, activar/desactivar.
- AC: feedback visual inmediato capa↔mapa.

### M3 — Clustering y densidad · MEDIA
- Agrupar puntos (intervenciones/predios) por zoom. Evaluar `leaflet.markercluster`
  o `L.circleMarker` con agrupación propia por celda.
- AC: a zoom bajo no hay solapamiento ilegible; al acercar se desagregan.

### M4 — Barra de estado del mapa · MEDIA
- Readout de **coordenadas**, **escala** y **zoom**; basemap switcher integrado.
- Archivo: nuevo `map-status-bar.tsx` + wiring en `map-client.tsx`.
- AC: coordenadas siguen al cursor; cambio de basemap sin abrir el dock.

### M5 — Accesibilidad · ALTA
- `aria-label`/`title` en todos los controles; navegación por teclado (± zoom,
  recenter); tamaño táctil ≥ 44 px.
- AC: se puede operar zoom/recenter y alternar capas sin mouse.

### M6 — Performance GIS (liga con UX-D9) · MEDIA
- MVT / `ST_Simplify` para drenajes (~11 MB). Cache HTTP. 
- AC: zoom fluido; payload por request < 2 MB.

## Orden de ejecución
M1 → M5 → M2 → M4 → M3 → M6 (M1 y M5 son los de mayor impacto y menor riesgo).
