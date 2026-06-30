"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const MapClient = dynamic(() => import("./map-client"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-surface-variant text-sm text-on-surface-variant">
      Cargando mapa…
    </div>
  ),
});

export function LeafletMap(
  props: ComponentProps<typeof MapClient>,
) {
  return <MapClient {...props} />;
}
