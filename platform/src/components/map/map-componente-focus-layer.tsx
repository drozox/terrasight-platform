"use client";

// =============================================================================
// MapComponenteFocusLayer (DEEPSEEK-76)
//
// Cuando el usuario elige un componente (C1/C2/C3) en el ribbon del dashboard,
// este layer:
//   1. pide la "huella" del componente (punto + polígono + línea) a
//      /api/geo?layer=componente&componente=Cx
//   2. la pinta resaltada por encima de las capas base
//   3. hace map.fitBounds → pan & zoom automático a la extensión del componente
//
// Sin componente activo no renderiza nada.
// =============================================================================

import * as React from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

interface Props {
  componente: string | null;
  onClick?: (feature: GeoJSON.Feature) => void;
}

const FOCUS_COLOR = "#d9480f";
const FOCUS_FILL = "#ff922b";

export function MapComponenteFocusLayer({ componente, onClick }: Props) {
  const map = useMap();
  const layerRef = React.useRef<L.GeoJSON | null>(null);

  React.useEffect(() => {
    if (!componente || !/^C[123]$/.test(componente)) return;

    let cancelled = false;
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          `/api/geo?layer=componente&componente=${encodeURIComponent(componente)}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as GeoJSON.FeatureCollection;
        if (cancelled) return;

        const gj = L.geoJSON(data, {
          style: () => ({
            color: FOCUS_COLOR,
            weight: 3,
            fillColor: FOCUS_FILL,
            fillOpacity: 0.35,
          }),
          pointToLayer: (_feature, latlng) =>
            L.circleMarker(latlng, {
              radius: 5,
              color: FOCUS_COLOR,
              weight: 2,
              fillColor: FOCUS_FILL,
              fillOpacity: 0.9,
            }),
          onEachFeature: (feature, layer) => {
            const props = (feature.properties ?? {}) as Record<string, unknown>;
            const nombre = (props.nombre as string) ?? "Intervención";
            layer.bindPopup(
              `<div class="font-sans text-xs"><strong>${nombre}</strong></div>`,
            );
            if (onClick) layer.on("click", () => onClick(feature));
          },
        }).addTo(map);

        layerRef.current = gj;

        const bounds = gj.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true });
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[MapComponenteFocusLayer] error:", e);
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
  }, [componente, map, onClick]);

  return null;
}
