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
import { MapRegionLabels } from "./map-region-labels";
import { WfsLayer } from "./wfs-layer";
import { GeoJsonLayer } from "./geojson-layer";
import { MapToolFeedback } from "./map-tool-feedback";
import { MapMeasureLayer, MapMeasureCursor } from "./map-measure-layer";
import { MapResultPanel } from "./map-result-panel";
import { MapIdentifyPanel } from "./map-identify-panel";
import type { IdentifiedFeature } from "@/lib/repos/identify";
import type { MapInteraction, LngLat } from "./map-types";

type BasemapKey = "osm" | "topo" | "satellite";

interface Props {
  /** @deprecated Mantenido por compatibilidad con /mapa/page.tsx; ya no se usan
   *  para renderizar markers. El mapa carga geometría real desde /api/geo. */
  predios?: { id: number; nombre: string; lat: number; lon: number }[];
  quebradas?: { id: number; nombre: string; lon: number; lat: number }[];
  geojson?: unknown;
  activeComponente?: string | null;
  height?: string;
  showLayersPanel?: boolean;
}

const BASEMAPS: Record<BasemapKey, { url: string; maxZoom?: number; attribution: string }> = {
  osm:       { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", maxZoom: 20, attribution: "© OpenStreetMap" },
  topo:      { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",  maxZoom: 17, attribution: "© OpenTopoMap" },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", maxZoom: 20, attribution: "Tiles © Esri" },
};

export default function MapClient({
  height = "100%",
  showLayersPanel = true,
}: Props) {
  // Centro default: Cundinamarca (Guasca/Cogua)
  const center: [number, number] = [4.92, -73.93];

  const [basemap, setBasemap] = React.useState<BasemapKey>("osm");
  // UX-13/UX-50 (audit 2026-07-24): `municipios` ahora prende por default
  // junto con predios y quebradas. La capa está implementada desde DEBT-3.8
  // y quitar el "próx." stale en el panel.
  const [layers, setLayers] = React.useState<Record<MapLayerKey, boolean>>({
    predios: true,
    quebradas: true,
    municipios: true,
    veredas: false,
    rios: false,
    vias: false,
    biomas: false,
    parques: false,
    reservas: false,
  });
  const [activeTool, setActiveTool] = React.useState<MapToolKey | null>(null);
  // Sprint 18: discriminated union con payload por herramienta
  const [interaction, setInteraction] = React.useState<MapInteraction>({ kind: "none" });
  // Sprint 18.2: estado para el panel de identificar
  const [identify, setIdentify] = React.useState<{
    features: IdentifiedFeature[];
    isLoading: boolean;
    error: string | null;
    query: { lng: number; lat: number } | null;
  }>({ features: [], isLoading: false, error: null, query: null });

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
      }
    },
    [interaction.kind, onIdentifyClick, onMeasureClick],
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
        />

        <ZoomControl position="topright" />
        <ScaleControl position="bottomright" imperial={false} />

        {/* Capas geográficas — geometría real (DEBT-3.8) */}
        {layers.municipios && (
          <GeoJsonLayer
            url="/api/geo?layer=municipios"
            color="#1f6feb"
            weight={2}
            fillColor="#1f6feb"
            fillOpacity={0.06}
            dashArray="6 4"
          />
        )}
        {layers.veredas && (
          <GeoJsonLayer
            url="/api/geo?layer=veredas"
            color="#0b7c3a"
            weight={1}
            fillColor="#0b7c3a"
            fillOpacity={0.05}
            dashArray="3 3"
          />
        )}
        {layers.predios && (
          <GeoJsonLayer
            url="/api/geo?layer=predios"
            color="#006d37"
            weight={2}
            fillColor="#006d37"
            fillOpacity={0.35}
          />
        )}
        {layers.biomas && (
          <GeoJsonLayer
            url="/api/geo?layer=biomas"
            color="#558b2f"
            weight={1}
            fillColor="#a3d977"
            fillOpacity={0.18}
          />
        )}
        {layers.quebradas && (
          <GeoJsonLayer
            url="/api/geo?layer=drenajes"
            color="#1f79b9"
            weight={1.5}
            fillOpacity={0}
          />
        )}
        {layers.rios && (
          <GeoJsonLayer
            url="/api/geo?layer=drenajes"
            color="#1f79b9"
            weight={2.5}
            fillOpacity={0}
          />
        )}
        {layers.vias && (
          <GeoJsonLayer
            url="/api/geo?layer=vias"
            color="#7a4a00"
            weight={1.2}
            fillOpacity={0}
            dashArray="2 3"
          />
        )}

        {/* Áreas protegidas (WFS — DEBT-3.7) */}
        {layers.parques && (
          <WfsLayer url="/api/wfs/parques" color="#2e7d32" fillOpacity={0.18} />
        )}
        {layers.reservas && (
          <WfsLayer url="/api/wfs/reservas" color="#558b2f" fillOpacity={0.12} />
        )}

        <MapRegionLabels />
      </MapContainer>

      {showLayersPanel && (
        <MapLayersPanel
          basemap={basemap}
          onBasemapChange={setBasemap}
          layers={layers}
          onLayersChange={setLayers}
        />
      )}

      {/* Tools toolbar inferior */}
      <MapTools
        activeTool={activeTool}
        onSelect={onSelectTool}
        onRecenter={onRecenter}
      />

      {/* Sprint 18.1: visual de medición (polyline, polygon, vertex markers) */}
      <MapMeasureLayer
        interaction={interaction}
        onClick={onMapClick}
        onMouseMove={() => {}}
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

      {/* Brújula flotante */}
      <MapCompass />
    </div>
  );
}
