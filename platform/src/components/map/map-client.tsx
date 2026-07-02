"use client";

import * as React from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
  ScaleControl,
} from "react-leaflet";
import L from "leaflet";
import type { PredioMini, MapFeatureCollection } from "@/lib/types";
import { MapLayersPanel, type MapLayerKey } from "./map-layers-panel";

// Fix: leaflet default icons no cargan en bundlers — usamos SVG inline.
// (resolve el bug clásico "marker icon not found")
const ICON_BASE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 24 16 24s16-13 16-24c0-8.8-7.2-16-16-16z"
          fill="#006d37" stroke="#00391a" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="6" fill="#FFFFFF"/>
  </svg>
`);

const ICON_HIDRO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 28">
    <path d="M12 0C5 0 0 5 0 12c0 8 12 16 12 16s12-8 12-16c0-7-5-12-12-12z"
          fill="#2f6388" stroke="#001e30" stroke-width="1"/>
    <circle cx="12" cy="11" r="4" fill="#FFFFFF"/>
  </svg>
`);

const ICON_HIDRO_DIM =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 28">
    <path d="M12 0C5 0 0 5 0 12c0 8 12 16 12 16s12-8 12-16c0-7-5-12-12-12z"
          fill="#9bccf6" stroke="#275c81" stroke-width="1"/>
    <circle cx="12" cy="11" r="4" fill="#FFFFFF"/>
  </svg>
`);

const ICON_PREDIO_DIM =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 24 16 24s16-13 16-24c0-8.8-7.2-16-16-16z"
          fill="#bccabc" stroke="#6d7a6e" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="6" fill="#FFFFFF"/>
  </svg>
`);

const iconPredio = L.icon({
  iconUrl: ICON_BASE,
  iconSize: [22, 28],
  iconAnchor: [11, 28],
  popupAnchor: [0, -26],
});

const iconPredioDim = L.icon({
  iconUrl: ICON_PREDIO_DIM,
  iconSize: [18, 22],
  iconAnchor: [9, 22],
  popupAnchor: [0, -20],
});

const iconQuebrada = L.icon({
  iconUrl: ICON_HIDRO,
  iconSize: [20, 24],
  iconAnchor: [10, 24],
  popupAnchor: [0, -22],
});

const iconQuebradaDim = L.icon({
  iconUrl: ICON_HIDRO_DIM,
  iconSize: [16, 20],
  iconAnchor: [8, 20],
  popupAnchor: [0, -18],
});

type BasemapKey = "osm" | "topo" | "satellite";

interface Props {
  predios: PredioMini[];
  quebradas: { id: number; nombre: string; lon: number; lat: number }[];
  geojson?: MapFeatureCollection;
  activeComponente?: string | null;
  height?: string;
  showLayersPanel?: boolean;
}

export default function MapClient({
  predios,
  quebradas,
  geojson,
  activeComponente,
  height = "100%",
  showLayersPanel = true,
}: Props) {
  // Centro default: Cundinamarca (Guasca/Cogua)
  const center: [number, number] = [4.92, -73.93];

  const [basemap, setBasemap] = React.useState<BasemapKey>("osm");
  const [layers, setLayers] = React.useState<Record<MapLayerKey, boolean>>({
    predios: true,
    quebradas: true,
    coberturas: false,
    municipios: false,
  });

  const BASEMAPS: Record<BasemapKey, { url: string; maxZoom?: number; attribution: string }> = {
    osm:       { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© OpenStreetMap" },
    topo:      { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",  maxZoom: 17,  attribution: "© OpenTopoMap" },
    satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "Tiles © Esri" },
  };

  // Centrar el mapa cuando hay un componente activo
  const mapRef = React.useRef<L.Map | null>(null);

  React.useEffect(() => {
    if (!mapRef.current || !activeComponente || !geojson) return;
    const f = geojson.features.find(
      (x) => x.properties.componente === activeComponente,
    );
    if (f) {
      mapRef.current.flyTo(
        [f.geometry.coordinates[1], f.geometry.coordinates[0]],
        12,
        { duration: 0.8 },
      );
    }
  }, [activeComponente, geojson]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom
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

        {/* Predios — resaltamos los del componente activo, atenuamos el resto */}
        {layers.predios &&
          predios.map((p) => {
            const feature = geojson?.features.find((f) => f.properties.id === p.id);
            const isHighlighted =
              activeComponente &&
              feature?.properties.componente === activeComponente;
            const isOther =
              activeComponente && !isHighlighted;
            return (
              <Marker
                key={`p-${p.id}`}
                position={[p.lat, p.lon]}
                icon={isOther ? iconPredioDim : iconPredio}
                zIndexOffset={isHighlighted ? 1000 : 0}
              >
                <Popup>
                  <div className="font-sans text-xs">
                    <strong className="mb-1 block text-sm text-on-surface">
                      {p.nombre}
                    </strong>
                    <div className="mb-1 font-mono text-on-surface-variant">
                      PR-{String(p.id).padStart(5, "0")}
                    </div>
                    {feature && (
                      <div className="space-y-0.5 border-t border-outline-variant pt-1.5 text-on-surface-variant">
                        <div>
                          <span className="font-bold">Área:</span>{" "}
                          {feature.properties.areaHa.toLocaleString("es-CO")} ha
                        </div>
                        <div>
                          <span className="font-bold">Componente:</span>{" "}
                          {feature.properties.componente}
                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Quebradas */}
        {layers.quebradas &&
          quebradas.map((q) => (
            <Marker
              key={`q-${q.id}`}
              position={[q.lat, q.lon]}
              icon={iconQuebrada}
            >
              <Popup>
                <div className="font-sans text-xs">
                  <strong className="mb-1 block text-sm text-secondary">
                    {q.nombre}
                  </strong>
                  <div className="text-on-surface-variant">Fuente hídrica</div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {showLayersPanel && (
        <MapLayersPanel
          basemap={basemap}
          onBasemapChange={setBasemap}
          layers={layers}
          onLayersChange={setLayers}
          prediosCount={predios.length}
          quebradasCount={quebradas.length}
        />
      )}
    </div>
  );
}