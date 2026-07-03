"use client";

import * as React from "react";
import {
  Layers,
  MapPin,
  Droplets,
  Trees,
  Map as MapIcon,
  Building2,
  Mountain,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MapLayerKey =
  | "municipios"
  | "veredas"
  | "rios"
  | "quebradas"
  | "parques"
  | "reservas"
  | "bosque"
  | "agropecuario"
  | "predios";

interface MapLayersPanelProps {
  basemap: "osm" | "topo" | "satellite";
  onBasemapChange: (k: "osm" | "topo" | "satellite") => void;
  layers: Record<MapLayerKey, boolean>;
  onLayersChange: (l: Record<MapLayerKey, boolean>) => void;
  prediosCount: number;
  quebradasCount: number;
}

/**
 * MapLayersPanel — panel "Capas Activas" reorganizado por grupos temáticos.
 * Inspirado en `map-panel.tsx` del dashboard de referencia, adaptado a
 * TerraSight.
 *
 * Grupos:
 *  - Límites Administrativos: municipios, veredas
 *  - Hidrografía: ríos, quebradas
 *  - Áreas Protegidas: parques, reservas
 *  - Cobertura Vegetal: bosque, agropecuario
 *  - Mis puntos: predios
 */
const LAYER_GROUPS: Array<{
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  items: Array<{
    key: MapLayerKey;
    label: string;
    badge?: string;
    active?: boolean;
  }>;
}> = [
  {
    title: "Límites Administrativos",
    Icon: Building2,
    items: [
      { key: "municipios", label: "Límite Municipal", badge: "próx." },
      { key: "veredas",    label: "Límite Veredal",  badge: "próx." },
    ],
  },
  {
    title: "Hidrografía",
    Icon: Droplets,
    items: [
      { key: "rios",      label: "Ríos principales", badge: "próx." },
      { key: "quebradas", label: "Quebradas" },
    ],
  },
  {
    title: "Áreas Protegidas",
    Icon: Mountain,
    items: [
      { key: "parques",  label: "Parques Naturales", badge: "próx." },
      { key: "reservas", label: "Reservas Forestales", badge: "próx." },
    ],
  },
  {
    title: "Cobertura Vegetal",
    Icon: Trees,
    items: [
      { key: "bosque",       label: "Bosque Natural", badge: "próx." },
      { key: "agropecuario", label: "Uso Agropecuario", badge: "próx." },
    ],
  },
  {
    title: "Mis Puntos",
    Icon: MapPin,
    items: [
      { key: "predios", label: "Predios del convenio" },
    ],
  },
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

  const counts: Partial<Record<MapLayerKey, number>> = {
    predios: prediosCount,
    quebradas: quebradasCount,
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
          Capas Activas
        </span>
        <ChevronRight
          className={cn(
            "size-3.5 text-on-surface-variant transition-transform",
            open && "rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="max-h-[calc(100vh-220px)] space-y-3 overflow-y-auto p-3">
          {/* Base map selector */}
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              Mapa base
            </p>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { k: "osm" as const,       label: "Calles"   },
                  { k: "topo" as const,      label: "Topo"     },
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

          {/* Capas overlay agrupadas */}
          {LAYER_GROUPS.map(({ title, Icon: GIcon, items }) => (
            <div key={title}>
              <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                <GIcon className="size-3" />
                {title}
              </p>
              <ul className="space-y-0.5">
                {items.map(({ key, label, badge }) => (
                  <li key={key}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-body-sm transition-colors hover:bg-surface-container-low",
                        badge && "opacity-60",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={!!layers[key]}
                        onChange={() => toggle(key)}
                        disabled={!!badge}
                        className="size-3.5 cursor-pointer rounded border-outline-variant accent-primary"
                      />
                      <span className="flex-1 font-medium text-on-surface">
                        {label}
                      </span>
                      {!badge && counts[key] !== undefined && (
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
          ))}
        </div>
      )}
    </div>
  );
}