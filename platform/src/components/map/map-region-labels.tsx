"use client";

import * as React from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";

/**
 * MapRegionLabels — etiquetas de regiones hidrográficas flotando sobre el mapa.
 * Implementado como Markers con `Tooltip permanent` (sigue pan/zoom del mapa).
 *
 * Coordenadas aproximadas de las regiones hidrográficas de Cundinamarca
 * donde el convenio CAR-WWF-FN tiene presencia:
 *  - Alto Magdalena: zona suroeste (Girardot, Ricaurte, Nilo)
 *  - Río Bogotá: corredor central (Cajicá, Chía, Zipaquirá)
 *  - Sabana Occidente: occidente (Madrid, Mosquera, Funza)
 *  - Río Negro: oriente (Guasca, Guatavita, La Calera)
 */

export interface RegionLabel {
  name: string;
  lat: number;
  lng: number;
  variant?: "primary" | "secondary";
}

const DEFAULT_REGIONS: RegionLabel[] = [
  { name: "Alto Magdalena",   lat: 4.30, lng: -74.75, variant: "secondary" },
  { name: "Río Bogotá",        lat: 4.95, lng: -74.05, variant: "primary"   },
  { name: "Sabana Occidente",  lat: 4.75, lng: -74.25, variant: "primary"   },
  { name: "Río Negro",         lat: 4.85, lng: -73.85, variant: "secondary" },
];

/**
 * Construye un divIcon HTML con el label estilizado según el theme TerraSight.
 */
function regionDivIcon(name: string, variant: "primary" | "secondary") {
  const bg = variant === "primary"
    ? "rgba(0,109,55,0.85)"
    : "rgba(47,99,136,0.85)";
  const html = `
    <div style="
      display:inline-block;
      padding:2px 8px;
      border-radius:4px;
      background:${bg};
      color:#fff;
      font-family:Hanken Grotesk, sans-serif;
      font-size:10px;
      font-weight:700;
      letter-spacing:0.05em;
      text-transform:uppercase;
      box-shadow:0 2px 6px rgba(0,0,0,0.2);
      white-space:nowrap;
      border:1px solid rgba(255,255,255,0.4);
    ">${name}</div>`;
  return L.divIcon({
    html,
    className: "map-region-label",
    iconSize: null as unknown as L.PointTuple,    // null permite auto-size
    iconAnchor: [0, 0],
  });
}

export function MapRegionLabels({
  regions = DEFAULT_REGIONS,
}: {
  regions?: RegionLabel[];
}) {
  return (
    <>
      {regions.map((r) => (
        <Marker
          key={r.name}
          position={[r.lat, r.lng]}
          icon={regionDivIcon(r.name, r.variant ?? "primary")}
          keyboard={false}
          interactive={false}
          zIndexOffset={-100}
        >
          <Tooltip
            direction="top"
            offset={[0, -4]}
            opacity={0}
            permanent
          />
        </Marker>
      ))}
    </>
  );
}