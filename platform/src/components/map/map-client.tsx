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
  const [layers, setLayers] = React.useState<Record<MapLayerKey, boolean>>({
    predios: true,
    quebradas: true,
    municipios: false,
    veredas: false,
    rios: false,
    vias: false,
    biomas: false,
    parques: false,
    reservas: false,
  });
  const [activeTool, setActiveTool] = React.useState<MapToolKey | null>(null);

  const onSelectTool = React.useCallback((tool: MapToolKey) => {
    setActiveTool((prev) => (prev === tool ? null : tool));
  }, []);

  const onRecenter = React.useCallback(() => {
    mapRef.current?.flyTo(center, 11, { duration: 0.6 });
  }, []);

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

      {/* Brújula flotante */}
      <MapCompass />
    </div>
  );
}
