"use client";

// =============================================================================
// GeoJsonLayer — fetches a /api/geo?layer=X y pinta polígonos/líneas con
// L.geoJSON. Usado por el mapa para mostrar geometría real de cada capa
// (no markers). DEBT-3.8.
// =============================================================================

import * as React from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

interface Props {
  url: string;
  color: string;
  weight?: number;
  fillColor?: string;
  fillOpacity?: number;
  dashArray?: string;
  onClick?: (feature: GeoJSON.Feature) => void;
}

export function GeoJsonLayer({
  url,
  color,
  weight = 2,
  fillColor,
  fillOpacity = 0.25,
  dashArray,
  onClick,
}: Props) {
  const map = useMap();
  const layerRef = React.useRef<L.GeoJSON | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = (await res.json()) as GeoJSON.FeatureCollection;
        if (cancelled) return;

        const gj = L.geoJSON(data, {
          style: () => ({
            color,
            weight,
            fillColor: fillColor ?? color,
            fillOpacity,
            dashArray,
          }),
          onEachFeature: (feature, layer) => {
            const props = (feature.properties ?? {}) as Record<string, unknown>;
            const html = renderPopup(props, feature);
            if (html) layer.bindPopup(html);
            if (onClick) {
              layer.on("click", () => onClick(feature));
            }
          },
        }).addTo(map);

        layerRef.current = gj;
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[GeoJsonLayer] Failed to load ${url}:`, e);
        }
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
    };
  }, [url, color, weight, fillColor, fillOpacity, dashArray, onClick, map]);

  return null;
}

function renderPopup(
  props: Record<string, unknown>,
  feature: GeoJSON.Feature
): string {
  const layer = (props.layer as string) ?? "feature";
  const nombre = (props.nombre as string) ?? `Elemento ${feature.id ?? ""}`;

  let body = `<strong class="mb-1 block text-sm text-on-surface">${nombre}</strong>`;
  if (props.areaHa) {
    body += `<div class="text-on-surface-variant">Área: ${Number(props.areaHa).toLocaleString("es-CO", { maximumFractionDigits: 2 })} ha</div>`;
  }
  if (props.longitudKm) {
    body += `<div class="text-on-surface-variant">Longitud: ${Number(props.longitudKm).toLocaleString("es-CO", { maximumFractionDigits: 2 })} km</div>`;
  }
  if (props.tipo && layer === "vias") {
    body += `<div class="text-on-surface-variant">Tipo: ${props.tipo}</div>`;
  }
  if (props.estado && (layer === "drenajes" || layer === "vias")) {
    body += `<div class="text-on-surface-variant">Estado: ${props.estado}</div>`;
  }
  if (props.departamento && layer === "municipios") {
    body += `<div class="text-on-surface-variant">Depto: ${props.departamento}</div>`;
  }
  if (props.actividad && layer === "propuestas") {
    body += `<div class="text-on-surface-variant">Actividad: ${props.actividad}</div>`;
  }
  return `<div class="font-sans text-xs">${body}</div>`;
}
