"use client";

// =============================================================================
// MonitoreoMap — wrapper público del mapa del módulo de monitoreo.
//
// IMPORTANTE: Este archivo es el "punto de entrada" para el Server Component
// padre (`/monitoreo/page.tsx`). NO importa `leaflet` ni `react-leaflet`
// directamente. Esos imports viven en `./monitoreo-map-client.tsx`, que se
// carga via `dynamic()` con `ssr: false` para evitar que Leaflet (que
// requiere `window` en su entry point) se ejecute durante el render del
// servidor, donde `window` no existe.
//
// Patrón idéntico al de `src/components/map/leaflet-map.tsx` + `map-client.tsx`.
// =============================================================================

import * as React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { MonitoreoPunto } from "@/lib/types";

const MonitoreoMapClient = dynamic(
  () => import("./monitoreo-map-client").then((m) => m.MonitoreoMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] w-full items-center justify-center rounded-xl bg-surface-variant text-sm text-on-surface-variant">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Cargando mapa…
      </div>
    ),
  },
);

export function MonitoreoMap({ puntos }: { puntos: MonitoreoPunto[] }) {
  return <MonitoreoMapClient puntos={puntos} />;
}
