"use client";

// =============================================================================
// MapComponenteFocusLayer (DEEPSEEK-76 + filtro por acción)
//
// Cuando el usuario elige un componente/acción, este layer centra el mapa en
// los elementos filtrados:
//   1. Pide los MUNICIPIOS de la acción (/api/geo?layer=municipios&...).
//      Ese es el encuadre de referencia ("los municipios y lo que haya dentro").
//   2. Si no hay municipios, cae a la "huella" de las propuestas
//      (/api/geo?layer=componente&...).
//
// NO pinta overlay propio: las capas de propuestas ya se muestran con su
// simbología por actividad. Solo hace fitBounds con padding generoso.
// =============================================================================

import * as React from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { AccionCode } from "@/lib/acciones";

interface Props {
  componente: string | null;
  accion?: AccionCode | null;
}

async function fetchBounds(
  url: string,
  signal: AbortSignal,
): Promise<L.LatLngBounds | null> {
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

  React.useEffect(() => {
    if (!componente || !/^C[123]$/.test(componente)) return;

    let cancelled = false;
    const ctrl = new AbortController();
    const qs =
      `componente=${encodeURIComponent(componente)}` +
      (accion ? `&accion=${encodeURIComponent(accion)}` : "");

    (async () => {
      // Preferimos los municipios de la acción; si no, la huella de propuestas.
      const bounds =
        (await fetchBounds(`/api/geo?layer=municipios&${qs}`, ctrl.signal)) ??
        (await fetchBounds(`/api/geo?layer=componente&${qs}`, ctrl.signal));

      if (cancelled || !bounds) return;
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 13, animate: true });
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [componente, accion, map]);

  return null;
}
