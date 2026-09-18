"use client";

// =============================================================================
// MapClient — visor del mapa principal (DEBT-3.8).
//
// Ahora cada capa geografía se renderiza con GEOMETRÍA REAL (polígono o línea)
// via L.geoJSON, en lugar de markers puntuales. La arquitectura es:
//
//   - Server side: cada tabla geografía expone /api/geo?layer=X con GeoJSON.
//   - Client side: <GeoJsonLayer> fetch + L.geoJSON con estilo por tipo.
//   - Panel: toggles por capa; cada toggle enciende el layer correspondiente.
//
// Capas implementadas (DEBT-3.8):
//   - municipios  → polígonos administrativos (azul)
//   - veredas     → polígonos administrativos (verde)
//   - predios     → polígonos catastrales (verde primario)
//   - biomas      → polígonos IAVH (verde claro)
//   - quebradas   → líneas hidrográficas (azul)
//   - rios        → idem quebradas, más grueso
//   - vias        → polilíneas (marrón)
//   - parques     → polígonos WFS (verde oscuro, DEBT-3.7)
//   - reservas    → polígonos WFS (verde claro, DEBT-3.7)
// =============================================================================

import * as React from "react";
import {
  MapContainer,
  TileLayer,
  ZoomControl,
  ScaleControl,
} from "react-leaflet";
import L from "leaflet";
import { MapLayersPanel, type MapLayerKey } from "./map-layers-panel";
import { MapTools, type MapToolKey } from "./map-tools";
import { MapCompass } from "./map-compass";
import { MapPrintPanel } from "./map-print-panel";
import { WfsLayer } from "./wfs-layer";
import { GeoJsonLayer } from "./geojson-layer";
import { MapComponenteFocusLayer } from "./map-componente-focus-layer";
import { TerritorioFocusLayer } from "./map-territorio-focus-layer";
import { lineColor, polygonColor, pointIcon } from "./map-symbology";
import type { AccionCode } from "@/lib/acciones";
import { MapLayerDataPanel } from "./map-layer-data-panel";
import { MapFeaturePanel } from "./map-feature-panel";
import { MapToolFeedback } from "./map-tool-feedback";
import { MapMeasureLayer, MapMeasureCursor } from "./map-measure-layer";
import { MapResultPanel } from "./map-result-panel";
import { MapIdentifyPanel } from "./map-identify-panel";
import { MapBufferLayer } from "./map-buffer-layer";
import { MapBufferPanel } from "./map-buffer-panel";
import { MapSpatialSelectLayer } from "./map-spatial-select-layer";
import { MapSpatialSelectPanel } from "./map-spatial-select-panel";
import type { IdentifiedFeature } from "@/lib/repos/identify";
import type { BufferResult } from "@/lib/repos/buffer";
import type { SpatialSelectResult } from "@/lib/repos/spatial-select";
import type { MapInteraction, LngLat } from "./map-types";

type BasemapKey = "osm" | "topo" | "satellite";

interface Props {
  /** @deprecated Mantenido por compatibilidad con /mapa/page.tsx; ya no se usan
   *  para renderizar markers. El mapa carga geometría real desde /api/geo. */
  predios?: { id: number; nombre: string; lat: number; lon: number }[];
  quebradas?: { id: number; nombre: string; lon: number; lat: number }[];
  geojson?: unknown;
  activeComponente?: string | null;
  activeAccion?: AccionCode | null;
  /** Filtro territorial activo (ids). */
  territorio?: { municipio: number | null; vereda: number | null; predio: number | null };
  /** Si es true, enfoca/zoomea y resalta el territorio seleccionado. */
  focusTerritorio?: boolean;
  height?: string;
  showLayersPanel?: boolean;
}

const BASEMAPS: Record<BasemapKey, { url: string; maxZoom?: number; attribution: string }> = {
  osm:       { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", maxZoom: 20, attribution: "© OpenStreetMap" },
  topo:      { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",  maxZoom: 17, attribution: "© OpenTopoMap" },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", maxZoom: 20, attribution: "Tiles © Esri" },
};

export default function MapClient({
  activeComponente = null,
  activeAccion = null,
  territorio = { municipio: null, vereda: null, predio: null },
  focusTerritorio = false,
  height = "100%",
  showLayersPanel = true,
}: Props) {
  // Centro default: Cundinamarca (Guasca/Cogua)
  const center: [number, number] = [4.92, -73.93];

  const [basemap, setBasemap] = React.useState<BasemapKey>("osm");
  const [printOpen, setPrintOpen] = React.useState(false);
  // UX-13/UX-50 (audit 2026-07-24): `municipios` ahora prende por default
  // junto con predios y quebradas. La capa está implementada desde DEBT-3.8
  // y quitar el "próx." stale en el panel.
  const [layers, setLayers] = React.useState<Record<MapLayerKey, boolean>>({
    predios: true,
    drenaje_simple: true,
    municipios: true,
    veredas: false,
    drenaje_doble: false,
    vias: false,
    biomas: false,
    parques: false,
    reservas: false,
    paramos: false,
    propuestas: false,
    propuestas_punto: false,
    propuestas_poligono: false,
  });

  // DEEPSEEK-77: al elegir un componente, encender sus capas de propuestas
  // (el MapComponenteFocusLayer además resalta + hace fitBounds).
  // Query de filtro por componente/acción para las capas de propuestas.
  const filtroQS =
    (activeComponente ? `&componente=${activeComponente}` : "") +
    (activeAccion ? `&accion=${activeAccion}` : "");

  // Al elegir un componente/acción: encender propuestas + capas base de contexto.
  React.useEffect(() => {
    if (!activeComponente && !activeAccion) return;
    setLayers((prev) => ({
      ...prev,
      propuestas: true,
      propuestas_punto: true,
      propuestas_poligono: true,
      predios: true,
      municipios: true,
      veredas: true,
      drenaje_simple: true,
      drenaje_doble: true,
      vias: true,
    }));
  }, [activeComponente, activeAccion]);
  const [activeTool, setActiveTool] = React.useState<MapToolKey | null>(null);
  // Capa cuyos DATOS (atributos) se muestran en el panel de datos.
  const [dataLayer, setDataLayer] = React.useState<MapLayerKey | null>(null);
  // Entidad clickeada en el mapa → panel de atributos (experiencia SIG).
  const [selectedFeature, setSelectedFeature] = React.useState<GeoJSON.Feature | null>(null);
  // Sprint 18: discriminated union con payload por herramienta
  const [interaction, setInteraction] = React.useState<MapInteraction>({ kind: "none" });
  // Sprint 18.2: estado para el panel de identificar
  const [identify, setIdentify] = React.useState<{
    features: IdentifiedFeature[];
    isLoading: boolean;
    error: string | null;
    query: { lng: number; lat: number } | null;
  }>({ features: [], isLoading: false, error: null, query: null });
  // Sprint 18.3: estado para el panel de buffer
  const [buffer, setBuffer] = React.useState<{
    distance: number;
    isLoading: boolean;
    error: string | null;
    result: BufferResult | null;
    origin: [number, number] | null;
  }>({ distance: 200, isLoading: false, error: null, result: null, origin: null });
  // Sprint 18.4: estado para selección por rectángulo (bbox)
  const [spatialSelect, setSpatialSelect] = React.useState<{
    isLoading: boolean;
    error: string | null;
    result: SpatialSelectResult | null;
  }>({ isLoading: false, error: null, result: null });

  const onSelectTool = React.useCallback((tool: MapToolKey) => {
    setActiveTool((prev) => {
      if (prev === tool) {
        // toggle off
        setInteraction({ kind: "none" });
        return null;
      }
      // Activar tool + mapear a interaction
      if (tool === "measure") setInteraction({ kind: "measure-distance", points: [] });
      else if (tool === "draw") setInteraction({ kind: "measure-area", points: [] });
      else if (tool === "select") setInteraction({ kind: "identify", lastClick: null });
      else if (tool === "markers") setInteraction({ kind: "buffer", center: null, distanceMeters: 200 });
      else if (tool === "bbox") setInteraction({ kind: "select-rectangle", start: null, end: null });
      else setInteraction({ kind: "none" });
      return tool;
    });
  }, []);

  // UX-11 (audit 2026-07-24): el MapToolFeedback necesita un onClose
  // explicito para limpiar el tool (en vez de re-togglear via onSelectTool).
  const onClearTool = React.useCallback(() => {
    setActiveTool(null);
    setInteraction({ kind: "none" });
    setIdentify({ features: [], isLoading: false, error: null, query: null });
    setBuffer({ distance: 200, isLoading: false, error: null, result: null, origin: null });
    setSpatialSelect({ isLoading: false, error: null, result: null });
  }, []);

  // Sprint 18.1: handlers de medición
  const onMeasureClick = React.useCallback((lngLat: LngLat) => {
    setInteraction((prev) => {
      if (prev.kind === "measure-distance") {
        return { ...prev, points: [...prev.points, lngLat] };
      }
      if (prev.kind === "measure-area") {
        return { ...prev, points: [...prev.points, lngLat] };
      }
      return prev;
    });
  }, []);

  // Sprint 18.3: handler de click para buffer
  const onBufferClick = React.useCallback(async (lngLat: LngLat) => {
    setBuffer((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      origin: lngLat,
    }));
    try {
      const r = await fetch("/api/analysis/buffer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geometry: { type: "Point", coordinates: lngLat },
          distance: buffer.distance,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setBuffer((prev) => ({ ...prev, isLoading: false, error: data.error || "Error" }));
        return;
      }
      setBuffer((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
        result: data as BufferResult,
      }));
    } catch (err) {
      setBuffer((prev) => ({
        ...prev,
        isLoading: false,
        error: (err as Error).message,
      }));
    }
  }, [buffer.distance]);

  // Sprint 18.2: handler de click para herramienta "Identificar"
  const onIdentifyClick = React.useCallback(async (lngLat: LngLat) => {
    setIdentify((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      query: { lng: lngLat[0], lat: lngLat[1] },
    }));
    try {
      const r = await fetch(
        `/api/geo/identify?lng=${lngLat[0]}&lat=${lngLat[1]}&tol=50&limit=10`,
      );
      const data = await r.json();
      if (!r.ok) {
        setIdentify((prev) => ({ ...prev, isLoading: false, error: data.error || "Error" }));
        return;
      }
      setIdentify({
        features: data.features as IdentifiedFeature[],
        isLoading: false,
        error: null,
        query: { lng: lngLat[0], lat: lngLat[1] },
      });
    } catch (err) {
      setIdentify((prev) => ({
        ...prev,
        isLoading: false,
        error: (err as Error).message,
      }));
    }
  }, []);

  // Sprint 18.4: handler de click para selección por rectángulo (2 clicks)
  const onSpatialSelectClick = React.useCallback(async (lngLat: LngLat) => {
    setInteraction((prev) => {
      if (prev.kind !== "select-rectangle") return prev;
      // Sin start → primer click: define start
      if (!prev.start) {
        return { ...prev, start: lngLat, end: null };
      }
      // Con start sin end → segundo click: define end y dispara fetch
      if (!prev.end) {
        // Disparar fetch async; retornar estado nuevo con end ya seteado
        const minLng = Math.min(prev.start[0], lngLat[0]);
        const maxLng = Math.max(prev.start[0], lngLat[0]);
        const minLat = Math.min(prev.start[1], lngLat[1]);
        const maxLat = Math.max(prev.start[1], lngLat[1]);
        setSpatialSelect({ isLoading: true, error: null, result: null });
        void (async () => {
          try {
            const r = await fetch("/api/analysis/spatial-select", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ minLng, minLat, maxLng, maxLat }),
            });
            const data = await r.json();
            if (!r.ok) {
              setSpatialSelect({ isLoading: false, error: data.error || "Error", result: null });
              return;
            }
            setSpatialSelect({ isLoading: false, error: null, result: data as SpatialSelectResult });
          } catch (err) {
            setSpatialSelect({ isLoading: false, error: (err as Error).message, result: null });
          }
        })();
        return { ...prev, end: lngLat };
      }
      // Ya tiene start + end → tercer click: reinicia con nuevo start
      return { ...prev, start: lngLat, end: null };
    });
  }, []);

  // Routing del click del mapa según la herramienta activa
  const onMapClick = React.useCallback(
    (lngLat: LngLat) => {
      if (interaction.kind === "identify") {
        onIdentifyClick(lngLat);
      } else if (
        interaction.kind === "measure-distance" ||
        interaction.kind === "measure-area"
      ) {
        onMeasureClick(lngLat);
      } else if (interaction.kind === "buffer") {
        onBufferClick(lngLat);
      } else if (interaction.kind === "select-rectangle") {
        onSpatialSelectClick(lngLat);
      }
    },
    [interaction.kind, onIdentifyClick, onMeasureClick, onBufferClick, onSpatialSelectClick],
  );

  const onRecenter = React.useCallback(() => {
    // UX-44 (audit 2026-07-24): era 0.6s. La skill ui-ux-pro-max recomienda
    // 150-300ms para flyTo. 350ms da tiempo a percibir el movimiento sin
    // sentirse lento (Leaflet flyTo interpola zoom + bearing + center).
    mapRef.current?.flyTo(center, 11, { duration: 0.35 });
  }, [center]);

  const mapRef = React.useRef<L.Map | null>(null);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={11}
        minZoom={3}
        maxZoom={22}
        scrollWheelZoom
        doubleClickZoom
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full rounded-xl"
        id="mapa-captura"
        style={{ background: "#cee5d8", height }}
        ref={(m) => {
          if (m) mapRef.current = m;
        }}
      >
        <TileLayer
          key={basemap}
          url={BASEMAPS[basemap].url}
          maxZoom={BASEMAPS[basemap].maxZoom}
          attribution={BASEMAPS[basemap].attribution}
          crossOrigin
        />

        <ZoomControl position="topright" />
        <ScaleControl position="bottomright" imperial={false} />

        {/* Capas geográficas — geometría real (DEBT-3.8) */}
        {layers.municipios && (
          <GeoJsonLayer
            url={`/api/geo?layer=municipios${filtroQS}`}
            color="#1b5e20"
            weight={2}
            fillColor="#1b5e20"
            fillOpacity={0.05}
            dashArray="6 4"
            onClick={setSelectedFeature}
          />
        )}
        {layers.veredas && (
          <GeoJsonLayer
            url={`/api/geo?layer=veredas${filtroQS}`}
            color="#43a047"
            weight={1.2}
            fillColor="#43a047"
            fillOpacity={0.04}
            dashArray="3 3"
            onClick={setSelectedFeature}
          />
        )}
        {layers.predios && (
          <GeoJsonLayer
            url={`/api/geo?layer=predios${filtroQS}`}
            color="#66bb6a"
            weight={1.5}
            fillColor="#a5d6a7"
            fillOpacity={0.45}
            onClick={setSelectedFeature}
          />
        )}
        {layers.propuestas && (
          <GeoJsonLayer
            url={`/api/geo?layer=propuestas${filtroQS}`}
            color="#b26a00"
            weight={3}
            fillOpacity={0}
            onClick={setSelectedFeature}
            styleForFeature={(f) => {
              const p = (f.properties as Record<string, unknown>) ?? {};
              const act = String(p.actividad ?? p.nombre ?? "");
              return { color: lineColor(act), weight: 3, fillOpacity: 0 };
            }}
          />
        )}
        {layers.propuestas_poligono && (
          <GeoJsonLayer
            url={`/api/geo?layer=propuestas_poligono${filtroQS}`}
            color="#b26a00"
            weight={2}
            fillColor="#f0b24a"
            fillOpacity={0.25}
            onClick={setSelectedFeature}
            styleForFeature={(f) => {
              const p = (f.properties as Record<string, unknown>) ?? {};
              const act = String(p.actividad ?? p.nombre ?? "");
              const c = polygonColor(act);
              return { color: c, weight: 2, fillColor: c, fillOpacity: 0.3 };
            }}
          />
        )}
        {layers.propuestas_punto && (
          <GeoJsonLayer
            url={`/api/geo?layer=propuestas_punto${filtroQS}`}
            color="#b26a00"
            weight={2}
            fillColor="#f0b24a"
            fillOpacity={0.8}
            onClick={setSelectedFeature}
            pointToLayer={(f, latlng) => {
              const p = (f.properties as Record<string, unknown>) ?? {};
              const act = String(p.actividad ?? p.nombre ?? "");
              return L.marker(latlng, { icon: pointIcon(act) });
            }}
          />
        )}
        {layers.biomas && (
          <GeoJsonLayer
            url="/api/geo?layer=biomas"
            color="#558b2f"
            weight={1}
            fillColor="#a3d977"
            fillOpacity={0.18}
            onClick={setSelectedFeature}
          />
        )}
        {layers.drenaje_simple && (
          <GeoJsonLayer
            url={`/api/geo?layer=drenajes${filtroQS}`}
            color="#1f79b9"
            weight={2}
            fillOpacity={0}
            dashArray="1 4"
            onClick={setSelectedFeature}
          />
        )}
        {layers.drenaje_doble && (
          <GeoJsonLayer
            url={`/api/geo?layer=drenajes_dobles${filtroQS}`}
            color="#0e4b6e"
            weight={3}
            fillOpacity={0}
            onClick={setSelectedFeature}
          />
        )}
        {layers.vias && (
          <GeoJsonLayer
            url={`/api/geo?layer=vias${filtroQS}`}
            color="#c25e00"
            weight={1.5}
            fillOpacity={0}
            dashArray="2 3"
            onClick={setSelectedFeature}
          />
        )}

        {/* Áreas protegidas (WFS — DEBT-3.7) */}
        {layers.parques && (
          <WfsLayer url="/api/wfs/parques" color="#2e7d32" fillOpacity={0.18} />
        )}
        {layers.reservas && (
          <WfsLayer url="/api/wfs/reservas" color="#558b2f" fillOpacity={0.12} />
        )}
        {layers.paramos && (
          <GeoJsonLayer
            url="/api/geo?layer=paramos"
            color="#6d7a6e"
            weight={1}
            fillColor="#9aa79b"
            fillOpacity={0.2}
            onClick={setSelectedFeature}
          />
        )}

        {/* Etiquetas de regiones hidrográficas removidas: eran decorativas y
           hardcodeadas (no provienen de la BD ni del convenio). */}

        {/* Zoom a componente (DEEPSEEK-76): centra la extensión de la acción
           activa (fitBounds) sin tapar la simbología de las propuestas. */}
        <MapComponenteFocusLayer
          componente={activeComponente}
          accion={activeAccion}
        />

        <TerritorioFocusLayer
          municipio={territorio.municipio}
          vereda={territorio.vereda}
          predio={territorio.predio}
          focus={focusTerritorio}
        />

        {/* P0-CRÍTICO: estos 3 layers usan useMap() y DEBEN estar dentro
           del MapContainer para tener el contexto de Leaflet. Antes estaban
           fuera → "useLeafletContext() can only be used in a descendant
           of <MapContainer>" en producción. */}
        <MapMeasureLayer
          interaction={interaction}
          onClick={onMapClick}
          onMouseMove={() => {}}
        />
        <MapBufferLayer buffer={buffer.result?.buffer ?? null} origin={buffer.origin} />
        <MapSpatialSelectLayer
          interaction={interaction}
          result={spatialSelect.result ? { bbox: spatialSelect.result.bbox } : null}
        />
      </MapContainer>

      {showLayersPanel && (
        <MapLayersPanel
          basemap={basemap}
          onBasemapChange={setBasemap}
          layers={layers}
          onLayersChange={setLayers}
          onShowData={setDataLayer}
        />
      )}

      {showLayersPanel && (
        <MapLayerDataPanel layer={dataLayer} onClose={() => setDataLayer(null)} />
      )}

      <MapFeaturePanel feature={selectedFeature} onClose={() => setSelectedFeature(null)} />

      {/* Tools toolbar inferior */}
      <MapTools
        activeTool={activeTool}
        onSelect={onSelectTool}
        onRecenter={onRecenter}
        onPrint={() => setPrintOpen(true)}
      />

      {/* UX-11: feedback inline cuando un tool no-implementado se selecciona.
         Aparece esquina sup-der, auto-dismiss a los 6s. */}
      <MapToolFeedback tool={activeTool} onClose={onClearTool} />

      {/* Sprint 18.1: panel con resultado de la medición (PostGIS) */}
      <MapResultPanel interaction={interaction} onClear={onClearTool} />

      {/* Sprint 18.2: panel con features identificadas */}
      <MapIdentifyPanel
        features={identify.features}
        isLoading={identify.isLoading}
        error={identify.error}
        lastQuery={identify.query}
        onClose={onClearTool}
        onClear={() => setIdentify({ features: [], isLoading: false, error: null, query: null })}
      />

      {/* Sprint 18.3: panel de buffer (solo UI, sin useMap) */}
      <MapBufferPanel
        isLoading={buffer.isLoading}
        error={buffer.error}
        result={buffer.result}
        distance={buffer.distance}
        onClose={onClearTool}
      />

      {/* Sprint 18.4: panel de selección por rectángulo (solo UI, sin useMap) */}
      <MapSpatialSelectPanel
        isLoading={spatialSelect.isLoading}
        error={spatialSelect.error}
        result={spatialSelect.result}
        onClose={onClearTool}
      />

      {/* Brújula flotante */}
      <MapCompass />

      {/* Ajuste 9: layout de impresión (captura el mapa + leyenda + medidas). */}
      <MapPrintPanel
        layers={layers}
        basemap={basemap}
        componente={activeComponente}
        accion={activeAccion}
        open={printOpen}
        onClose={() => setPrintOpen(false)}
      />
    </div>
  );
}
