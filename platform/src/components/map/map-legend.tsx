"use client";

// =============================================================================
// MapLegend — simbología REAL de las capas activas del visor (F2).
//
// Recibe el estado de capas del mapa y muestra un swatch (polígono/línea/punto)
// con el color/estilo correspondiente, sincronizado con lo que se ve.
// Colores alineados con `map-client.tsx`.
// =============================================================================

import * as React from "react";
import { Info, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapLayerKey } from "./map-layers-panel";

type Kind = "polygon" | "line" | "point";
interface LayerStyle {
  label: string;
  color: string;
  kind: Kind;
}

export const LAYER_SYMBOLOGY: Record<MapLayerKey, LayerStyle> = {
  municipios:          { label: "Límite municipal",       color: "#1f6feb", kind: "line" },
  veredas:             { label: "Límite veredal",         color: "#0b7c3a", kind: "line" },
  predios:             { label: "Predios concertados",    color: "#006d37", kind: "polygon" },
  biomas:              { label: "Biomas IAVH",            color: "#a3d977", kind: "polygon" },
  quebradas:           { label: "Quebradas / drenajes",   color: "#1f79b9", kind: "line" },
  rios:                { label: "Ríos",                   color: "#1f79b9", kind: "line" },
  vias:                { label: "Vías",                   color: "#7a4a00", kind: "line" },
  propuestas_poligono: { label: "Intervenciones (áreas)", color: "#f0b24a", kind: "polygon" },
  propuestas:          { label: "Intervenciones (líneas)", color: "#b26a00", kind: "line" },
  propuestas_punto:    { label: "Intervenciones (puntos)", color: "#b26a00", kind: "point" },
  parques:             { label: "Parques naturales",      color: "#2e7d32", kind: "polygon" },
  reservas:            { label: "Reservas forestales",    color: "#558b2f", kind: "polygon" },
};

export function Swatch({ style }: { style: LayerStyle }) {
  if (style.kind === "point") {
    return (
      <span
        className="inline-block size-3 shrink-0 rounded-full ring-2 ring-surface-container-lowest"
        style={{ background: style.color }}
      />
    );
  }
  if (style.kind === "line") {
    return (
      <span
        className="inline-block h-[3px] w-4 shrink-0 rounded-full"
        style={{ background: style.color }}
      />
    );
  }
  return (
    <span
      className="inline-block size-3 shrink-0 rounded-[3px] ring-2 ring-surface-container-lowest"
      style={{ background: style.color, opacity: 0.75 }}
    />
  );
}

export function MapLegend({
  layers,
  className,
}: {
  layers: Record<MapLayerKey, boolean>;
  className?: string;
}) {
  const [open, setOpen] = React.useState(true);
  const active = (Object.keys(layers) as MapLayerKey[]).filter((k) => layers[k]);

  return (
    <div
      className={cn(
        "absolute bottom-4 left-4 z-[600] w-60 max-w-[calc(100%-2rem)] overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest/95 shadow-xl backdrop-blur",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-b border-outline-variant/40 px-3 py-2 text-left transition-colors hover:bg-surface-container-low"
      >
        <span className="flex items-center gap-2 text-label-lg font-bold uppercase text-on-surface-variant">
          <Info className="size-3.5" />
          Leyenda
        </span>
        <ChevronRight
          className={cn("size-3.5 text-on-surface-variant transition-transform", open && "rotate-90")}
        />
      </button>

      {open && (
        <ul className="max-h-[45vh] space-y-1.5 overflow-y-auto px-3 py-2.5 text-body-sm">
          {active.length === 0 ? (
            <li className="text-on-surface-variant italic">Sin capas activas</li>
          ) : (
            active.map((k) => {
              const s = LAYER_SYMBOLOGY[k];
              return (
                <li key={k} className="flex items-center gap-2.5">
                  <Swatch style={s} />
                  <span className="flex-1 text-on-surface">{s.label}</span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
