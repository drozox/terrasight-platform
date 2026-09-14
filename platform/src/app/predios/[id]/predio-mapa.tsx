"use client";

// =============================================================================
// PredioMapa — DEEPSEEK-71 (F4)
//
// Mini-mapa con el polígono del predio centrado en su bbox.
// El padre (page.tsx) lo carga con `dynamic({ ssr: false })` para evitar el
// `window is not defined` de leaflet en SSR (mismo patrón que el visor).
//
// Soporta MultiPolygon, Polygon y Point.
// =============================================================================

import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { MapFeature } from "@/lib/types";
import type { Geometry } from "geojson";

type LngLat = [number, number];

function bboxOf(coords: number[][]): { west: number; south: number; east: number; north: number } {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return { west, south, east, north };
}

function centroidBBox(geom: Geometry): { center: LngLat; zoom: number } | null {
  if (geom.type !== "Polygon" && geom.type !== "MultiPolygon") return null;
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  const rings: number[][][] =
    geom.type === "Polygon"
      ? (geom.coordinates as number[][][])
      : (geom.coordinates as number[][][][]).flat();
  for (const ring of rings) {
    const b = bboxOf(ring);
    if (b.west < west) west = b.west;
    if (b.east > east) east = b.east;
    if (b.south > south) south = b.south;
    if (b.north > north) north = b.north;
  }
  const center: LngLat = [(west + east) / 2, (south + north) / 2];
  const span = Math.max(east - west, north - south);
  const zoom = span > 0.1 ? 12 : span > 0.01 ? 14 : span > 0.001 ? 16 : 17;
  return { center, zoom };
}

export function PredioMapa({ feature }: { feature: MapFeature | null }) {
  if (!feature || !feature.geometry) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low text-body-sm text-on-surface-variant">
        Sin geometría asociada.
      </div>
    );
  }
  const geometry = feature.geometry as Geometry;
  const codigo = (feature.properties as { codigo?: string })?.codigo ?? "Predio";

  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates as number[];
    return (
      <MapContainer
        center={[lat, lng] as LngLat}
        zoom={16}
        scrollWheelZoom={false}
        className="h-64 w-full rounded-lg border border-outline-variant"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    );
  }
  const cb = centroidBBox(geometry);
  if (!cb) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low text-body-sm text-on-surface-variant">
        Geometría no soportada ({geometry.type}).
      </div>
    );
  }
  return (
    <MapContainer
      center={cb.center}
      zoom={cb.zoom}
      scrollWheelZoom={false}
      className="h-64 w-full rounded-lg border border-outline-variant"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON
        data={{
          type: "Feature",
          geometry,
          properties: { name: codigo },
        } as never}
        style={{
          color: "#1f6f43",
          weight: 2,
          fillColor: "#2e7d4f",
          fillOpacity: 0.25,
        }}
      />
    </MapContainer>
  );
}
