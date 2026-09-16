"use client";

// =============================================================================
// IndicadorMap — mapa del drill-down de metas (F4-review).
// Recibe la FeatureCollection ya reproyectada a 4326 y la pinta según el tipo
// de indicador (líneas / polígonos / puntos / predios).
// =============================================================================

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { FeatureCollection } from "geojson";

type Kind = "lineas" | "poligonos" | "puntos" | "super";

const CENTER: [number, number] = [4.95, -74.05];

function Fit({ data }: { data: FeatureCollection }) {
  const map = useMap();
  React.useEffect(() => {
    if (!data.features.length) return;
    const b = L.geoJSON(data).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [30, 30], maxZoom: 15 });
  }, [data, map]);
  return null;
}

export function IndicadorMap({
  data,
  kind,
}: {
  data: FeatureCollection;
  kind: Kind;
}) {
  const color =
    kind === "puntos" ? "#1f6feb" : kind === "poligonos" ? "#b26a00" : kind === "super" ? "#d9480f" : "#006d37";

  return (
    <MapContainer
      center={CENTER}
      zoom={11}
      scrollWheelZoom
      className="h-[420px] w-full rounded-lg border border-outline-variant"
      style={{ background: "#cee5d8" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap"
      />
      <Fit data={data} />
      <GeoJSON
        data={data as never}
        style={() =>
          kind === "puntos"
            ? {}
            : {
                color,
                weight: kind === "poligonos" || kind === "super" ? 1.8 : 3,
                fillColor: color,
                fillOpacity: kind === "poligonos" || kind === "super" ? 0.25 : 0,
              }
        }
        pointToLayer={(_f, latlng) =>
          L.circleMarker(latlng, {
            radius: 6,
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.85,
          })
        }
        onEachFeature={(feature, layer) => {
          const p = (feature.properties ?? {}) as {
            id?: number;
            nombre?: string | null;
            actividad?: string | null;
            medida?: number | null;
            unidad?: string;
          };
          const titulo = p.nombre ?? p.actividad ?? `#${p.id ?? ""}`;
          const medida =
            p.medida != null
              ? `<br/><span style="color:#555">${p.medida.toFixed(2)} ${p.unidad ?? ""}</span>`
              : "";
          layer.bindTooltip(
            `<div style="font-size:11px"><strong>${titulo}</strong>${medida}</div>`,
          );
        }}
      />
    </MapContainer>
  );
}
