# PLAN — Ajustes 2, 5, 6, 8, 9 (pendientes de la lista de 9)

Ya implementados: **A1, A3, A4, A7** y **A2 parcial** (se quitó /mapa del nav).
Este doc planifica el resto. Ejecutor sugerido: T1 (MiniMax). Front-end.

---

## A2 (resto) — Toggles de paneles en Inicio
**Objetivo:** apagar/mostrar cada panel, recordando la preferencia. Los tabs C1/C2/C3
NO se apagan.
- Nuevo `src/components/dashboard/panel-toggle.tsx` (client): botón con menú de
  checkboxes (Indicadores generales, Metas, Franja, Cobertura*, Top municipios,
  Monitor de intervenciones, Tendencia, Intervenciones por componente).
  *Cobertura ya se quitó (A7).*
- Persistencia: `localStorage("dashboard.paneles")`. Para que un server component
  respete la preferencia, envolver cada sección en un client `<ToggleablePanel id>`
  que, tras montar, aplica `hidden` si la pref está en false (evita mismatch SSR).
- Archivos: `panel-toggle.tsx`, `dashboard-suspense.tsx` (envolver secciones),
  `right-panel.tsx`.
- AC: cada toggle oculta/muestra su panel; recarga mantiene la preferencia.

## A5 (resto) — El mapa debe filtrar por componente/acción
Hoy: ribbon + KPIs + tabla + *huella* (fitBounds) ya filtran. Falta que las **capas
base** se restrinjan y se auto-activen.
- `/api/geo`: aceptar `componente`/`accion` en las capas
  `predios`, `vias`, `drenajes`, `propuestas`, `propuestas_punto`, `propuestas_poligono`
  → `src/lib/repos/geojson.ts` (añadir filtro por join a `sgs_pro_propuesta`→accion→componente;
  para vías/drenajes usar `ST_Intersects` con las propuestas del componente).
- `map-client.tsx`: al haber `activeComponente`/`activeAccion`: auto-encender
  `predios`, `vias`, `quebradas` (+ `propuestas_*`) y `fitBounds`; el usuario puede
  apagarlas luego (no re-forzar).
- AC: click en C1 → mapa muestra solo intervenciones/predios/vías/drenajes de C1 y
  hace zoom; click en C1A1 → idem acotado a A1.

## A6 — Mover "Metas del convenio" a la columna derecha
- Sacar `<MetasStrip>` de la columna izquierda y montarlo en el `RightPanel`
  (o en un panel lateral con tabs: Indicadores / Metas / Intervenciones / Tendencia).
- Hacer el strip colapsable; versión compacta (10 metas, barras de progreso).
- La izquierda queda: mapa (más alto) + fila inferior. 
- AC: el mapa gana altura; Metas funciona igual y es colapsable.

## A8 — Capa "Intervenciones (líneas)" + acciones por capa
- Añadir `propuestas_linea` a `MapLayerKey` y al panel de capas (ya existe
  `getPropuestasLineaGeoJSON` y `/api/geo?layer=propuestas`).
- Menú por capa (botón ⋯): **Ver tabla completa** (modal con paginación, búsqueda,
  orden y exportar), **Descargar** (CSV / GeoJSON / Shapefile vía `ogr2ogr` en el
  server o GeoJSON en cliente), **Zoom a la capa**, **Propiedades**.
- AC: la capa de líneas se ve y se togglea; el modal lista y exporta.

## A9 — "Imprimir layout"
- Botón en el mapa → modal con Título / Descripción / Solicitado por / Fecha (auto) y
  vista previa.
- Capturar el mapa con capas activas: `leaflet` + `html2canvas` (o `leaflet-image`).
- Incluir: título, fecha, mapa, leyenda, escala gráfica+numérica, norte, y la lista de
  intervenciones visibles con su **actividad** y **medida** (líneas km/m, áreas ha,
  puntos tipo).
- Export: PDF (`jsPDF`), PNG, e `window.print()`.
- Nuevas deps: `html2canvas`, `jspdf`. Confirmar con T0 antes de instalar.
- AC: genera un layout fiel a las capas activas y exporta.

---

## Orden sugerido
A5 (mayor valor, ya casi) → A6 → A2 → A8 → A9 (el más pesado).

## Coordinación
- Worktree propio `t1/ajustes`, un commit por ajuste, `npm run release:gate` verde.
- No tocar BD/migraciones. Confirmar nuevas dependencias con T0.
