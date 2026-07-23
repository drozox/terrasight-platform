"use client";

// =============================================================================
// WfsLayer — capa de polígonos fetched on-demand desde un endpoint backend
// (e.g. /api/wfs/parques, /api/wfs/reservas). El endpoint hace el fetch al
// WFS real server-side (evita CORS) y devuelve GeoJSON. Esta componente pinta
// los polígonos con L.geoJSON + un popup con metadata.
//
// DEBT-3.7 — áreas protegidas de Cundinamarca.
// =============================================================================

import * as React from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

type FeatureCollection = GeoJSON.FeatureCollection;

interface Props {
  url: string;
  color: string;
  fillOpacity: number;
}

export function WfsLayer({ url, color, fillOpacity }: Props) {
  const map = useMap();
  const layerRef = React.useRef<L.GeoJSON | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = (await res.json()) as FeatureCollection;
        if (cancelled) return;

        const gj = L.geoJSON(data, {
          style: () => ({
            color,
            weight: 2,
            fillColor: color,
            fillOpacity,
            dashArray: "4 4",
          }),
          onEachFeature: (feature, layer) => {
            const props = (feature.properties ?? {}) as { nombre?: string; tipo?: string };
            const nombre = props.nombre ?? "Área protegida";
            const tipo = props.tipo ?? "";
            layer.bindPopup(
              `<div class="font-sans text-xs">
                <strong class="mb-1 block text-sm text-on-surface">${nombre}</strong>
                ${tipo ? `<div class="text-on-surface-variant">${tipo}</div>` : ""}
              </div>`,
            );
          },
        }).addTo(map);

        layerRef.current = gj;
      } catch (e) {
        // Ignore aborts; log the rest in dev only
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[WfsLayer] Failed to load ${url}:`, e);
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
  }, [url, color, fillOpacity, map]);

  return null;
}
