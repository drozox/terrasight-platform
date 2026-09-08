// =============================================================================
// MapSpatialSelectLayer — visualiza el rectángulo de selección + preview
// =============================================================================

"use client";

import * as React from "react";
import { Rectangle, useMap } from "react-leaflet";
import L from "leaflet";
import type { MapInteraction, LngLat } from "./map-types";

export function MapSpatialSelectLayer({
  interaction,
  result,
}: {
  interaction: MapInteraction;
  result: { bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number } } | null;
}) {
  const map = useMap();

  // Auto-zoom al bbox cuando hay resultado
  React.useEffect(() => {
    if (result?.bbox) {
      const { minLat, minLng, maxLat, maxLng } = {
        minLat: result.bbox.minLat,
        minLng: result.bbox.minLng,
        maxLat: result.bbox.maxLat,
        maxLng: result.bbox.maxLng,
      };
      const bounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17, animate: true });
    }
  }, [result, map]);

  // Mostrar rectángulo con 2 puntos
  if (interaction.kind !== "select-rectangle") return null;
  const { start, end } = interaction;
  if (!start) return null;

  // Si solo hay start, mostrar preview
  if (!end) {
    return null; // El preview se muestra en MapMousePreview o similar
  }

  const bounds: L.LatLngBoundsExpression = [
    [Math.min(start[1], end[1]), Math.min(start[0], end[0])],
    [Math.max(start[1], end[1]), Math.max(start[0], end[0])],
  ];

  return (
    <Rectangle
      bounds={bounds}
      pathOptions={{
        color: result ? "#059669" : "#2563eb",
        weight: 2,
        fillColor: result ? "#059669" : "#2563eb",
        fillOpacity: result ? 0.1 : 0.15,
        dashArray: "4 4",
      }}
    />
  );
}
