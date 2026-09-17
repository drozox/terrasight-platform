"use client";

// =============================================================================
// PredioMapa — geometría del predio (polígono), fitBounds, tooltip y overlay
// con nombre + municipio/vereda.
//   - El GeoJSON llega reproyectado a 4326 (getPrediosGeoJSON de geojson.ts).
//   - Polygon/MultiPolygon: polígono resaltado + fitBounds.
//   - Point: marcador.
// =============================================================================

import * as React from "react";
import L from "leaflet";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Geometry } from "geojson";

type LngLat = [number, number];
type InfoMapa = { nombre: string; codigo: string; municipio: string | null; vereda: string | null };
export type PredioFeature = {
  geometry: Geometry | null;
  properties?: Record<string, unknown> | null;
};

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
  if (![west, south, east, north].every(Number.isFinite)) return null;
  const center: LngLat = [(west + east) / 2, (south + north) / 2];
  const span = Math.max(east - west, north - south);
  const zoom = span > 0.1 ? 12 : span > 0.01 ? 14 : span > 0.001 ? 16 : 17;
  return { center, zoom };
}

function FitBounds({ geometry }: { geometry: Geometry }) {
  const map = useMap();
  React.useEffect(() => {
    const b = L.geoJSON(geometry).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [30, 30], maxZoom: 16 });
  }, [geometry, map]);
  return null;
}

const OSM = {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a>',
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
};

function Overlay({ info }: { info?: InfoMapa }) {
  if (!info) return null;
  const lugar = [info.vereda, info.municipio].filter(Boolean).join(" · ");
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[80%] rounded-lg bg-surface-container-lowest/95 px-3 py-2 shadow-md backdrop-blur">
      <p className="font-mono text-[10px] text-on-surface-variant">{info.codigo}</p>
      <p className="text-[13px] font-bold text-on-surface">{info.nombre}</p>
      {lugar && <p className="text-[11px] text-on-surface-variant">{lugar}</p>}
    </div>
  );
}

export function PredioMapa({ feature, info }: { feature: PredioFeature | null; info?: InfoMapa }) {
  if (!feature || !feature.geometry) {
    return (
      <div className="relative">
        <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low text-body-sm text-on-surface-variant">
          Sin geometría asociada.
        </div>
        <Overlay info={info} />
      </div>
    );
  }
  const geometry = feature.geometry as Geometry;
  const props = (feature.properties ?? {}) as { codigo?: string; nombre?: string };
  const nombre = info?.nombre ?? props.nombre ?? "Predio";
  const codigo = info?.codigo ?? props.codigo ?? props.nombre ?? "Predio";

  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates as number[];
    return (
      <div className="relative">
        <MapContainer
          center={[lat, lng] as LngLat}
          zoom={16}
          scrollWheelZoom={false}
          className="h-64 w-full rounded-lg border border-outline-variant"
        >
          <TileLayer {...OSM} />
          <CircleMarker
            center={[lat, lng] as LngLat}
            radius={9}
            pathOptions={{ color: "#d9480f", weight: 2, fillColor: "#ff922b", fillOpacity: 0.9 }}
          >
            <Tooltip>{nombre}</Tooltip>
          </CircleMarker>
        </MapContainer>
        <Overlay info={info} />
      </div>
    );
  }

  const cb = centroidBBox(geometry);
  if (!cb) {
    return (
      <div className="relative">
        <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low text-body-sm text-on-surface-variant">
          Geometría no soportada ({geometry.type}).
        </div>
        <Overlay info={info} />
      </div>
    );
  }
  return (
    <div className="relative">
      <MapContainer
        center={cb.center}
        zoom={cb.zoom}
        scrollWheelZoom={false}
        className="h-64 w-full rounded-lg border border-outline-variant"
      >
        <TileLayer {...OSM} />
        <FitBounds geometry={geometry} />
        <GeoJSON
          data={{
            type: "Feature",
            geometry,
            properties: { name: codigo },
          } as never}
          style={{
            color: "#d9480f",
            weight: 2.5,
            fillColor: "#ff922b",
            fillOpacity: 0.28,
          }}
          onEachFeature={(_f, layer) => {
            layer.bindTooltip(nombre, { sticky: true });
          }}
        />
      </MapContainer>
      <Overlay info={info} />
    </div>
  );
}
