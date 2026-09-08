// =============================================================================
// MapBufferLayer — dibuja el polygon del buffer + el centro/punto origen
// =============================================================================

"use client";

import * as React from "react";
import { Polygon, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import type { BufferGeometry } from "@/lib/repos/buffer";

/** Convierte GeoJSON coords a Leaflet [lat, lng] (invierte orden) */
function geoJsonToLatLng(coords: number[]): [number, number] {
  // GeoJSON: [lng, lat] → Leaflet: [lat, lng]
  return [coords[1], coords[0]];
}

export function MapBufferLayer({
  buffer,
  origin,
}: {
  buffer: BufferGeometry | null;
  origin: [number, number] | null; // [lng, lat] del punto de origen
}) {
  const map = useMap();

  // Auto-zoom al buffer cuando aparece
  React.useEffect(() => {
    if (buffer && buffer.type === "Polygon") {
      const ring = buffer.coordinates[0];
      if (ring.length > 0) {
        const latsLngs = ring.map((c) => [c[1], c[0]] as [number, number]);
        const bounds = L.latLngBounds(latsLngs);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17, animate: true });
      }
    }
  }, [buffer, map]);

  if (!buffer) return null;

  if (buffer.type === "Polygon") {
    const positions = buffer.coordinates[0].map(
      (c) => [c[1], c[0]] as [number, number],
    );
    return (
      <>
        <Polygon
          positions={positions}
          pathOptions={{
            color: "#dc2626",
            weight: 2,
            fillColor: "#dc2626",
            fillOpacity: 0.15,
            dashArray: "6 4",
          }}
        />
        {origin && (
          <CircleMarker
            center={[origin[1], origin[0]]}
            radius={6}
            pathOptions={{
              color: "#dc2626",
              fillColor: "#dc2626",
              fillOpacity: 1,
              weight: 2,
            }}
          />
        )}
      </>
    );
  }

  return null;
}
