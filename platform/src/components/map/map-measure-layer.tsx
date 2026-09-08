// =============================================================================
// MapMeasureLayer — visualiza la polilínea/polígono de medición en el mapa
//
// Renderiza sobre el LeafletMap:
//   - Una Polyline para distance (roja)
//   - Una Polygon para area (translúcida)
//   - CircleMarker en cada vértice
//   - Un marker "fantasma" que sigue al cursor mientras se dibuja
//
// Usa `useMap()` de react-leaflet para acceder a la instancia del mapa y
// añadir/limpiar layers según `interaction.kind`.
// =============================================================================

"use client";

import * as React from "react";
import { Polyline, Polygon, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { MapInteraction, LngLat } from "./map-types";

export function MapMeasureLayer({
  interaction,
  onClick,
  onMouseMove,
}: {
  interaction: MapInteraction;
  onClick: (lngLat: LngLat) => void;
  onMouseMove: (lngLat: LngLat) => void;
}) {
  // Suscribirse a eventos del mapa solo si hay una herramienta activa
  const active = interaction.kind === "measure-distance" || interaction.kind === "measure-area";

  useMapEvents({
    click(e) {
      if (!active) return;
      onClick([e.latlng.lng, e.latlng.lat]);
    },
    mousemove(e) {
      if (!active) return;
      onMouseMove([e.latlng.lng, e.latlng.lat]);
    },
  });

  // Cambiar cursor del mapa a crosshair cuando hay herramienta activa
  const map = useMap();
  React.useEffect(() => {
    const container = map.getContainer();
    if (active) {
      container.style.cursor = "crosshair";
    } else {
      container.style.cursor = "";
    }
    return () => {
      container.style.cursor = "";
    };
  }, [active, map]);

  if (!active) return null;

  const points = interaction.points;

  if (interaction.kind === "measure-distance" && points.length >= 1) {
    return (
      <>
        <Polyline
          positions={points.map(([lng, lat]) => [lat, lng] as [number, number])}
          pathOptions={{ color: "#dc2626", weight: 3, dashArray: "6 4" }}
        />
        {points.map(([lng, lat], i) => (
          <CircleMarker
            key={`pt-${i}`}
            center={[lat, lng]}
            radius={6}
            pathOptions={{
              color: "#dc2626",
              fillColor: i === 0 ? "#dc2626" : "#ffffff",
              fillOpacity: 1,
              weight: 2,
            }}
          />
        ))}
      </>
    );
  }

  if (interaction.kind === "measure-area" && points.length >= 2) {
    // Para polígono: cerrar con el primer punto si tiene ≥3 puntos
    const ring =
      points.length >= 3
        ? [...points, points[0]]
        : points;
    return (
      <>
        {points.length >= 3 && (
          <Polygon
            positions={ring.map(([lng, lat]) => [lat, lng] as [number, number])}
            pathOptions={{
              color: "#2563eb",
              weight: 2,
              fillColor: "#2563eb",
              fillOpacity: 0.2,
            }}
          />
        )}
        <Polyline
          positions={points.map(([lng, lat]) => [lat, lng] as [number, number])}
          pathOptions={{ color: "#2563eb", weight: 2, dashArray: "6 4" }}
        />
        {points.map(([lng, lat], i) => (
          <CircleMarker
            key={`pt-${i}`}
            center={[lat, lng]}
            radius={6}
            pathOptions={{
              color: "#2563eb",
              fillColor: i === 0 ? "#2563eb" : "#ffffff",
              fillOpacity: 1,
              weight: 2,
            }}
          />
        ))}
      </>
    );
  }

  return null;
}

/** Marker fantasma que sigue al cursor mientras se dibuja. */
export function MapMeasureCursor({
  interaction,
  cursorLngLat,
}: {
  interaction: MapInteraction;
  cursorLngLat: LngLat | null;
}) {
  if (!cursorLngLat) return null;
  const active = interaction.kind === "measure-distance" || interaction.kind === "measure-area";
  if (!active) return null;
  if (interaction.points.length === 0) return null;
  const last = interaction.points[interaction.points.length - 1];
  const preview: LngLat[] = [last, cursorLngLat];
  return (
    <Polyline
      positions={preview.map(([lng, lat]) => [lat, lng] as [number, number])}
      pathOptions={{ color: interaction.kind === "measure-distance" ? "#dc2626" : "#2563eb", weight: 2, dashArray: "4 4", opacity: 0.6 }}
    />
  );
}
