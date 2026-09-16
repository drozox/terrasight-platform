"use client";

// Wrapper client: `ssr: false` solo puede usarse dentro de un Client Component.
// El page del drill-down es un Server Component, así que delega el lazy load
// de Leaflet (que no corre en SSR) a este wrapper.

import dynamic from "next/dynamic";
import type { FeatureCollection } from "geojson";

type Kind = "lineas" | "poligonos" | "puntos" | "super";

const IndicadorMap = dynamic(
  () => import("./indicador-map").then((m) => m.IndicadorMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] w-full items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low text-body-sm text-on-surface-variant">
        Cargando mapa…
      </div>
    ),
  },
);

export function IndicadorMapLoader({
  data,
  kind,
}: {
  data: FeatureCollection;
  kind: Kind;
}) {
  return <IndicadorMap data={data} kind={kind} />;
}
