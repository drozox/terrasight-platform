// =============================================================================
// MapBufferPanel — muestra el resultado del análisis de buffer
// =============================================================================

"use client";

import * as React from "react";
import { Target, X, Loader2, Building2, Wrench, Droplet, MapPin, Car } from "lucide-react";
import type { BufferResult } from "@/lib/repos/buffer";

const ICON_MAP = {
  predios: Building2,
  propuestas: Wrench,
  propuesta_puntos: Wrench,
  quebradas: Droplet,
  drenaje: Droplet,
  vias: Car,
};

const LABEL_MAP = {
  predios: "Predios",
  propuestas: "Propuestas",
  propuesta_puntos: "Puntos",
  quebradas: "Quebradas",
  drenaje: "Drenaje",
  vias: "Vías",
};

export function MapBufferPanel({
  isLoading,
  error,
  result,
  distance,
  onClose,
}: {
  isLoading: boolean;
  error: string | null;
  result: BufferResult | null;
  distance: number;
  onClose: () => void;
}) {
  if (!isLoading && !error && !result) return null;

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-[700] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-outline-variant/50 bg-surface-container-lowest/98 p-4 shadow-2xl backdrop-blur max-h-[calc(100vh-12rem)] flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-on-surface">Buffer {distance}m</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar análisis de buffer"
          className="rounded p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
        >
          <X className="size-4" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-on-surface-variant py-3">
          <Loader2 className="size-3 animate-spin" />
          Generando buffer…
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
            <div className="text-xs text-on-surface-variant">Área del buffer</div>
            <div className="text-xl font-bold text-on-surface font-mono">
              {result.buffer_area_ha.toFixed(2)} ha
            </div>
          </div>

          <div className="text-xs text-on-surface-variant mb-2">Features dentro del buffer</div>
          <ul className="divide-y divide-outline-variant/30 -mx-1 px-1 overflow-y-auto flex-1 min-h-0">
            {(Object.keys(result.results) as Array<keyof typeof result.results>).map((k) => {
              const Icon = ICON_MAP[k];
              const n = result.results[k];
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
