"use client";

// =============================================================================
// TerritorioFocusLayer — al presionar "Buscar" en los filtros, enfoca (zoom)
// y resalta el municipio/vereda/predio seleccionado, con tooltip.
// Toma la capa más específica disponible: predio > vereda > municipio.
// =============================================================================

import * as React from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export function TerritorioFocusLayer({
  municipio,
  vereda,
  predio,
  focus,
}: {
  municipio: number | null;
  vereda: number | null;
  predio: number | null;
  focus: boolean;
}) {
  const map = useMap();
  const ref = React.useRef<L.GeoJSON | null>(null);

  React.useEffect(() => {
    if (!focus) return;
    const layer = predio ? "predios" : vereda ? "veredas" : municipio ? "municipios" : null;
    const id = predio ?? vereda ?? municipio;
    if (!layer || id == null) return;

    let cancelled = false;
    const ctrl = new AbortController();

    (async () => {
      try {
        const r = await fetch(`/api/geo?layer=${layer}`, { signal: ctrl.signal });
        if (!r.ok) return;
        const data = (await r.json()) as GeoJSON.FeatureCollection;
        if (cancelled) return;
        const feat = data.features.find(
          (f) => Number((f.properties as Record<string, unknown> | null)?.id) === id,
        );
        if (!feat) return;

        const nombre = String(
          (feat.properties as Record<string, unknown> | null)?.nombre ?? "Selección",
        );
        const gj = L.geoJSON(feat, {
          style: { color: "#d9480f", weight: 3, fillColor: "#ff922b", fillOpacity: 0.3 },
        })
          .bindTooltip(nombre, { sticky: true, permanent: false })
          .addTo(map);

        ref.current = gj;
        const b = gj.getBounds();
        if (b.isValid()) map.fitBounds(b, { padding: [60, 60], maxZoom: 16 });
        gj.openTooltip();
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
      if (ref.current) {
        ref.current.remove();
        ref.current = null;
      }
    };
  }, [municipio, vereda, predio, focus, map]);

  return null;
}
