"use client";

import * as React from "react";
import { Layers, MapPin, Droplets, Trees, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MapLayerKey = "predios" | "quebradas" | "coberturas" | "municipios";

interface MapLayersPanelProps {
  basemap: "osm" | "topo" | "satellite";
  onBasemapChange: (k: "osm" | "topo" | "satellite") => void;
  layers: Record<MapLayerKey, boolean>;
  onLayersChange: (l: Record<MapLayerKey, boolean>) => void;
  prediosCount: number;
  quebradasCount: number;
}

const LAYERS_META: Array<{
  key: MapLayerKey;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}> = [
  { key: "predios",    label: "Predios",          Icon: MapPin },
  { key: "quebradas",  label: "Fuentes Hídricas", Icon: Droplets },
  { key: "coberturas", label: "Cobertura Vegetal", Icon: Trees, badge: "próx." },
  { key: "municipios", label: "Límites Municipales", Icon: MapIcon, badge: "próx." },
];

export function MapLayersPanel({
  basemap,
  onBasemapChange,
  layers,
  onLayersChange,
  prediosCount,
  quebradasCount,
}: MapLayersPanelProps) {
  const [open, setOpen] = React.useState(true);

  const toggle = (k: MapLayerKey) =>
    onLayersChange({ ...layers, [k]: !layers[k] });

  const counts: Record<MapLayerKey, number> = {
    predios:    prediosCount,
    quebradas:  quebradasCount,
    coberturas: 0,
    municipios: 0,
  };

  return (
    <div className="absolute left-4 top-4 z-[600] w-72 max-w-[calc(100%-2rem)] overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest/95 shadow-xl backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-b border-outline-variant/40 px-3 py-2 text-left transition-colors hover:bg-surface-container-low"
      >
        <span className="flex items-center gap-2 text-label-lg font-bold uppercase text-on-surface-variant">
          <Layers className="size-4" />
          Capas
        </span>
        <span className="text-[10px] font-bold text-on-surface-variant">
          {open ? "ocultar" : "mostrar"}
        </span>
      </button>

      {open && (
        <div className="space-y-3 p-3">
          {/* Base map selector */}
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase text-on-surface-variant">
              Mapa base
            </p>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { k: "osm" as const, label: "Calles" },
                  { k: "topo" as const, label: "Topo" },
                  { k: "satellite" as const, label: "Satélite" },
                ]
              ).map((b) => (
                <button
                  key={b.k}
                  type="button"
                  onClick={() => onBasemapChange(b.k)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-[11px] font-bold transition-colors",
                    basemap === b.k
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-variant hover:text-on-surface",
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Capas overlay */}
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase text-on-surface-variant">
              Capas
            </p>
            <ul className="space-y-1">
              {LAYERS_META.map(({ key, label, Icon, badge }) => (
                <li key={key}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-body-sm transition-colors hover:bg-surface-container-low",
                      badge && "opacity-60",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={layers[key]}
                      onChange={() => toggle(key)}
                      disabled={!!badge}
                      className="size-3.5 cursor-pointer rounded border-outline-variant accent-primary"
                    />
                    <Icon className="size-4 text-on-surface-variant" />
                    <span className="flex-1 font-medium text-on-surface">
                      {label}
                    </span>
                    {!badge && (
                      <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                        {counts[key]}
                      </span>
                    )}
                    {badge && (
                      <span className="rounded-full bg-tertiary-container/30 px-2 py-0.5 text-[9px] font-bold uppercase text-tertiary">
                        {badge}
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}