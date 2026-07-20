"use client";

// =============================================================================
// Mapa mini para la ficha de intervención (HU-IC-03).
//
// Renderiza la geometría de la intervención en un LeafletMap compacto:
//   - punto:    Marker con el icono de la app.
//   - linea:    Polyline coloreada (primary).
//   - poligono: Polygon coloreado (primary) con fill.
//
// Si no hay geometría, muestra un placeholder centrado en Cundinamarca.
//
// Usa `react-leaflet@5` directo (no el `LeafletMap` de la home — ese filtra
// por componente y no es reutilizable para geometrías arbitrarias).
// =============================================================================

import * as React from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
} from "react-leaflet";
import { MapPin, Loader2 } from "lucide-react";
import type { IntervencionCompleta, GeoJSONLineString, GeoJSONPolygon } from "@/lib/types";

// -----------------------------------------------------------------------------
// Centroid por tipo de geometría
// -----------------------------------------------------------------------------
const CUNDINAMARCA_CENTER: [number, number] = [4.92, -73.93];

function computeCentroid(
  intervencion: IntervencionCompleta,
): { center: [number, number]; zoom: number } {
  if (intervencion.tipo === "punto" && intervencion.geom) {
    // En la BD, "este" es lon y "norte" es lat (EPSG:4686). El tipo ya
    // devuelve `lon` y `lat` separados, lo cual es lo que Leaflet espera.
    return {
      center: [intervencion.geom.lat, intervencion.geom.lon],
      zoom: 14,
    };
  }
  if (intervencion.tipo === "linea" && intervencion.geom) {
    return centroidOfCoords(intervencion.geom.geojson.coordinates, 13);
  }
  if (intervencion.tipo === "poligono" && intervencion.geom) {
    // Polygon.coordinates: [[ [lon, lat], ... ]] — primer anillo.
    return centroidOfCoords(intervencion.geom.geojson.coordinates[0] ?? [], 13);
  }
  return { center: CUNDINAMARCA_CENTER, zoom: 11 };
}

function centroidOfCoords(
  coords: [number, number][],
  fallbackZoom: number,
): { center: [number, number]; zoom: number } {
  if (!coords.length) return { center: CUNDINAMARCA_CENTER, zoom: fallbackZoom };
  let minLon = coords[0]![0];
  let maxLon = coords[0]![0];
  let minLat = coords[0]![1];
  let maxLat = coords[0]![1];
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const center: [number, number] = [(minLat + maxLat) / 2, (minLon + maxLon) / 2];
  // Aproximación de zoom según la diagonal del bbox en grados.
  const diag = Math.hypot(maxLon - minLon, maxLat - minLat);
  let zoom = fallbackZoom;
  if (diag > 1) zoom = 9;
  else if (diag > 0.1) zoom = 11;
  else if (diag > 0.01) zoom = 13;
  else if (diag > 0.001) zoom = 15;
  else zoom = 16;
  return { center, zoom };
}

// -----------------------------------------------------------------------------
// Icon inline para puntos (evita el bug "marker icon not found" del bundler).
// -----------------------------------------------------------------------------
const ICON_INTERVENCION = L.icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 24 16 24s16-13 16-24c0-8.8-7.2-16-16-16z"
            fill="#2f6388" stroke="#001e30" stroke-width="1.5"/>
      <circle cx="16" cy="16" r="6" fill="#FFFFFF"/>
    </svg>
  `),
  iconSize: [22, 28],
  iconAnchor: [11, 28],
  popupAnchor: [0, -26],
});

// -----------------------------------------------------------------------------
// Props del shell — recibe la intervención completa del page.tsx.
// -----------------------------------------------------------------------------
function MapaMiniShell({ intervencion }: { intervencion: IntervencionCompleta }) {
  const { center, zoom } = computeCentroid(intervencion);

  // GeoJSON data — construida según el tipo.
  const data = React.useMemo(() => {
    if (intervencion.tipo === "linea" && intervencion.geom) {
      return lineaToFeature(intervencion.geom.geojson, intervencion.id);
    }
    if (intervencion.tipo === "poligono" && intervencion.geom) {
      return poligonoToFeature(intervencion.geom.geojson, intervencion.id);
    }
    return null;
  }, [intervencion]);

  const style = React.useCallback(
    (): L.PathOptions => ({
      color: "#006d37", // primary
      weight: 3,
      fillColor: "#006d37",
      fillOpacity: 0.18,
    }),
    [],
  );

  if (intervencion.tipo === "punto" && intervencion.geom) {
    return (
      <div className="relative h-72 w-full overflow-hidden rounded-xl">
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={false}
          zoomControl={true}
          className="h-full w-full"
          style={{ background: "#cee5d8" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />
          <Marker
            position={[intervencion.geom.lat, intervencion.geom.lon]}
            icon={ICON_INTERVENCION}
          />
        </MapContainer>
      </div>
    );
  }

  if (data) {
    return (
      <div className="relative h-72 w-full overflow-hidden rounded-xl">
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={false}
          zoomControl={true}
          className="h-full w-full"
          style={{ background: "#cee5d8" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />
          <GeoJSON data={data} style={style} />
        </MapContainer>
      </div>
    );
  }

  // Sin geom: placeholder con centro de Cundinamarca.
  return (
    <div className="flex h-72 w-full flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low text-center text-on-surface-variant">
      <MapPin className="mb-2 size-8 opacity-40" />
      <p className="text-body-sm font-semibold">Geometría no disponible</p>
      <p className="mt-1 text-[11px]">
        La propuesta existe pero no tiene geometría asociada en la BD.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Wrappers GeoJSON — FeatureCollection con la geometría de la intervención.
// -----------------------------------------------------------------------------
function lineaToFeature(g: GeoJSONLineString, id: number) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        id,
        geometry: g,
        properties: { id, tipo: "linea" },
      },
    ],
  };
}

function poligonoToFeature(g: GeoJSONPolygon, id: number) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        id,
        geometry: g,
        properties: { id, tipo: "poligono" },
      },
    ],
  };
}

// -----------------------------------------------------------------------------
// Public component — wrapper con `dynamic(..., { ssr: false })`.
// -----------------------------------------------------------------------------
const MapaMiniClient = dynamic(() => Promise.resolve(MapaMiniShell), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-xl bg-surface-variant text-sm text-on-surface-variant">
      <Loader2 className="mr-2 size-4 animate-spin" />
      Cargando mapa…
    </div>
  ),
});

export function IntervencionMapa({
  intervencion,
}: {
  intervencion: IntervencionCompleta;
}) {
  return <MapaMiniClient intervencion={intervencion} />;
}
