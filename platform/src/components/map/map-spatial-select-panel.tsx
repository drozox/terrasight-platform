// =============================================================================
// MapSpatialSelectPanel — muestra el resultado de la selección espacial
// =============================================================================

"use client";

import * as React from "react";
import { Square, X, Loader2, Building2, Wrench, MapPin, Spline, Droplet, Car, Landmark, Home } from "lucide-react";
import type { SpatialSelectResult } from "@/lib/repos/spatial-select";

const ICON_MAP: Record<keyof SpatialSelectResult["results"], React.ComponentType<{ className?: string }>> = {
  predios: Building2,
  propuestas: Wrench,
  propuesta_puntos: MapPin,
  propuesta_lineas: Spline,
  propuesta_poligonos: Square,
  quebradas: Droplet,
  drenaje: Droplet,
  vias: Car,
  municipios: Landmark,
  veredas: Home,
};

const LABEL_MAP: Record<keyof SpatialSelectResult["results"], string> = {
  predios: "Predios",
  propuestas: "Propuestas",
  propuesta_puntos: "Puntos",
  propuesta_lineas: "Líneas",
  propuesta_poligonos: "Polígonos",
  quebradas: "Quebradas",
  drenaje: "Drenaje",
  vias: "Vías",
  municipios: "Municipios",
  veredas: "Veredas",
};

export function MapSpatialSelectPanel({
  isLoading,
  error,
  result,
  onClose,
}: {
  isLoading: boolean;
  error: string | null;
  result: SpatialSelectResult | null;
  onClose: () => void;
}) {
  if (!isLoading && !error && !result) return null;

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-[700] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-outline-variant/50 bg-surface-container-lowest/98 p-4 shadow-2xl backdrop-blur max-h-[calc(100vh-12rem)] flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Square className="size-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-on-surface">Selección espacial</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar selección espacial"
          className="rounded p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="text-xs text-on-surface-variant mb-3 flex-shrink-0">
        {isLoading
          ? "Contando features…"
          : result
            ? "Click en 2 puntos del mapa para definir un rectángulo."
            : "Click en 2 puntos del mapa para definir un rectángulo."}
      </p>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-on-surface-variant py-3">
          <Loader2 className="size-3 animate-spin" />
          Calculando…
        </div>
      )}

      {error && (
        <div className="text-xs text-red-700 py-2" role="alert">
          Error: {error}
        </div>
      )}

      {result && (
        <>
          <div className="mb-3 text-sm">
            <div className="text-xs text-on-surface-variant">Área seleccionada</div>
            <div className="text-xl font-bold text-on-surface font-mono">
              {result.area_km2.toFixed(2)} km²
            </div>
          </div>

          <div className="text-xs text-on-surface-variant mb-2">Features dentro</div>
          <ul className="divide-y divide-outline-variant/30 -mx-1 px-1 overflow-y-auto flex-1 min-h-0">
            {(Object.keys(result.results) as Array<keyof typeof result.results>).map((k) => {
              const n = result.results[k];
              const Icon = ICON_MAP[k];
              return (
                <li key={k} className="flex items-center gap-2 py-1.5 text-sm">
                  <Icon className="size-3.5 text-on-surface-variant flex-shrink-0" aria-hidden="true" />
                  <span className="text-on-surface flex-1">{LABEL_MAP[k]}</span>
                  <span className={`font-mono font-semibold ${n > 0 ? "text-primary" : "text-on-surface-variant"}`}>
                    {n}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
