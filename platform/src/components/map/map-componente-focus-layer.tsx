"use client";

// =============================================================================
// MapComponenteFocusLayer (DEEPSEEK-76 + filtro por acción)
//
// Cuando el usuario elige un componente/acción, este layer:
//   1. pide la "huella" (punto + polígono + línea) de las propuestas a
//      /api/geo?layer=componente&componente=Cx[&accion=CxAy]
//   2. hace fitBounds → centra y muestra TODA la extensión seleccionada
//
// NO pinta overlay propio: las capas de propuestas ya se muestran con su
// simbología por actividad (líneas por color, puntos por ícono, polígonos por
// grupo). Así el zoom no tapa lo filtrado.
// =============================================================================

import * as React from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { AccionCode } from "@/lib/acciones";

interface Props {
  componente: string | null;
  accion?: AccionCode | null;
}

export function MapComponenteFocusLayer({ componente, accion = null }: Props) {
  const map = useMap();

  React.useEffect(() => {
    if (!componente || !/^C[123]$/.test(componente)) return;

    let cancelled = false;
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          `/api/geo?layer=componente&componente=${encodeURIComponent(componente)}${
            accion ? `&accion=${encodeURIComponent(accion)}` : ""
          }`,
          { signal: ctrl.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as GeoJSON.FeatureCollection;
        if (cancelled || !data.features?.length) return;

        // Solo calculamos los límites (sin agregar capa visible).
        const bounds = L.geoJSON(data).getBounds();
        if (bounds.isValid()) {
          // padding generoso para que nada quede pegado al borde.
          map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14, animate: true });
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
    };
  }, [componente, accion, map]);

  return null;
}
