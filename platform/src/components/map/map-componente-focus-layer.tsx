"use client";

// =============================================================================
// MapComponenteFocusLayer (DEEPSEEK-76 + filtro por acción)
//
// 1. Centra el mapa en los elementos filtrados:
//    - Pide los MUNICIPIOS de la acción (/api/geo?layer=municipios&...).
//    - Si no hay, cae a la "huella" de las propuestas.
// 2. Mantiene el encuadre cuando el contenedor cambia de tamaño (al mostrar/
//    ocultar paneles laterales): llama `invalidateSize()` y re-hace fitBounds.
//
// NO pinta overlay propio: las capas de propuestas ya se muestran con su
// simbología por actividad.
// =============================================================================

import * as React from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { AccionCode } from "@/lib/acciones";

interface Props {
  componente: string | null;
  accion?: AccionCode | null;
}

const FIT_OPTS: L.FitBoundsOptions = { padding: [80, 80], maxZoom: 13 };

async function fetchBounds(url: string, signal: AbortSignal): Promise<L.LatLngBounds | null> {
  try {
    const res = await fetch(url, { signal, cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as GeoJSON.FeatureCollection;
    if (!data.features?.length) return null;
    const bounds = L.geoJSON(data).getBounds();
    return bounds.isValid() ? bounds : null;
  } catch {
    return null;
  }
}

export function MapComponenteFocusLayer({ componente, accion = null }: Props) {
  const map = useMap();
  const boundsRef = React.useRef<L.LatLngBounds | null>(null);

  // Encuadre por componente/acción.
  React.useEffect(() => {
    if (!componente || !/^C[123]$/.test(componente)) return;

    let cancelled = false;
    const ctrl = new AbortController();
    const qs =
      `componente=${encodeURIComponent(componente)}` +
      (accion ? `&accion=${encodeURIComponent(accion)}` : "");

    (async () => {
      const bounds =
        (await fetchBounds(`/api/geo?layer=municipios&${qs}`, ctrl.signal)) ??
        (await fetchBounds(`/api/geo?layer=componente&${qs}`, ctrl.signal));

      if (cancelled || !bounds) return;
      boundsRef.current = bounds;
      map.fitBounds(bounds, { ...FIT_OPTS, animate: true });
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [componente, accion, map]);

  // Al cambiar el tamaño del contenedor (paneles on/off), recalcular el mapa y
  // re-encuadrar en la última extensión filtrada.
  React.useEffect(() => {
    const container = map.getContainer();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
      if (boundsRef.current) {
        map.fitBounds(boundsRef.current, { ...FIT_OPTS, animate: false });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);

  return null;
}
