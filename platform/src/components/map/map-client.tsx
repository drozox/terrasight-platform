"use client";

import * as React from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import type { PredioMini, MapFeatureCollection } from "@/lib/types";

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

const iconPredio = L.icon({
  iconUrl: ICON_BASE,
  iconSize: [22, 28],
  iconAnchor: [11, 28],
  popupAnchor: [0, -26],
});

const iconQuebrada = L.icon({
  iconUrl: ICON_HIDRO,
  iconSize: [18, 22],
  iconAnchor: [9, 22],
  popupAnchor: [0, -20],
});

interface Props {
  predios: PredioMini[];
  quebradas: { id: number; nombre: string; lon: number; lat: number }[];
  geojson?: MapFeatureCollection;
}

export default function MapClient({ predios, quebradas, geojson }: Props) {
  // Centro default: Cundinamarca
  const center: [number, number] = [4.6, -74.1];

  return (
    <MapContainer
      center={center}
      zoom={9}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full rounded-xl"
      attributionControl={false}
      style={{ background: "#cee5d8" }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Mapa (OpenStreetMap)">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Topográfico (OpenTopoMap)">
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            maxZoom={17}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satélite (Esri)">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles © Esri"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <ZoomControl position="right" />

      {/* Predios */}
      {predios.map((p) => (
        <Marker key={`p-${p.id}`} position={[p.lat, p.lon]} icon={iconPredio}>
          <Popup>
            <div className="text-xs">
              <strong className="block">{p.nombre}</strong>
              <span className="text-gray-500">PR-{String(p.id).padStart(5, "0")}</span>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Quebradas */}
      {quebradas.map((q) => (
        <Marker key={`q-${q.id}`} position={[q.lat, q.lon]} icon={iconQuebrada}>
          <Popup>
            <div className="text-xs">
              <strong className="block">{q.nombre}</strong>
              <span className="text-gray-500">Quebrada</span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
