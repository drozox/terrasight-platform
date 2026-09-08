// =============================================================================
// MapIdentifyPanel — muestra el resultado de la herramienta "Identificar"
//
// Sprint 18.2. Lista de features cercanas al último click, ordenadas por
// distancia. Cada item muestra tipo + nombre + distancia + propiedades
// relevantes. Click en un item resalta la feature en el mapa (futuro).
// =============================================================================

"use client";

import * as React from "react";
import { Search, MapPin, X, Loader2, ExternalLink } from "lucide-react";
import type { IdentifiedFeature } from "@/lib/repos/identify";

const TIPO_LABEL: Record<string, string> = {
  predio: "Predio",
  propuesta: "Propuesta",
  propuesta_punto: "Propuesta (punto)",
  quebrada: "Quebrada",
  drenaje_simple: "Drenaje",
  via: "Vía",
  municipio: "Municipio",
  vereda: "Vereda",
  microcuenca: "Microcuenca",
};

const TIPO_COLOR: Record<string, string> = {
  predio: "bg-primary",
  propuesta: "bg-secondary",
  propuesta_punto: "bg-secondary",
  quebrada: "bg-info",
  drenaje_simple: "bg-info",
  via: "bg-warning",
  municipio: "bg-tertiary",
  vereda: "bg-tertiary",
  microcuenca: "bg-tertiary",
};

const TIPO_ICON_COLOR: Record<string, string> = {
  predio: "text-primary",
  propuesta: "text-secondary",
  propuesta_punto: "text-secondary",
  quebrada: "text-info",
  drenaje_simple: "text-info",
  via: "text-warning",
  municipio: "text-tertiary",
  vereda: "text-tertiary",
  microcuenca: "text-tertiary",
};

function formatDistance(m: number): string {
  if (m < 1) return "aquí";
  if (m < 1000) return `${m.toFixed(0)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function formatPropertyValue(v: string | number | null): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(2);
  }
  return String(v);
}

export function MapIdentifyPanel({
  features,
  isLoading,
  error,
  lastQuery,
  onClose,
  onClear,
}: {
  features: IdentifiedFeature[];
  isLoading: boolean;
  error: string | null;
  lastQuery: { lng: number; lat: number } | null;
  onClose: () => void;
  onClear: () => void;
}) {
  if (!isLoading && !error && features.length === 0 && !lastQuery) return null;

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-[700] w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-outline-variant/50 bg-surface-container-lowest/98 p-4 shadow-2xl backdrop-blur max-h-[calc(100vh-12rem)] flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-on-surface">Identificar</h3>
        </div>
        <div className="flex items-center gap-1">
          {lastQuery && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Limpiar resultado"
              className="rounded px-2 py-1 text-xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            >
              Limpiar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar herramienta de identificación"
            className="rounded p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {lastQuery && (
        <p className="text-xs text-on-surface-variant mb-3 flex-shrink-0">
          <MapPin className="inline size-3" /> {lastQuery.lng.toFixed(4)}, {lastQuery.lat.toFixed(4)}
        </p>
      )}

      <div className="overflow-y-auto -mx-1 px-1 flex-1 min-h-0">
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant py-4">
            <Loader2 className="size-3 animate-spin" />
            Buscando features…
          </div>
        )}

        {error && (
          <div className="text-xs text-red-700 py-2" role="alert">
            Error: {error}
          </div>
        )}

        {!isLoading && !error && features.length === 0 && lastQuery && (
          <div className="text-xs text-on-surface-variant italic py-4">
            No hay features en 50m del punto. Probá con un zoom más alto o cambiá la tolerancia.
          </div>
        )}

        {!isLoading && features.length > 0 && (
          <ul className="divide-y divide-outline-variant/30">
            {features.map((f) => (
              <li
                key={`${f.tipo}-${f.id}`}
                className="py-2 first:pt-0 last:pb-0"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${TIPO_COLOR[f.tipo] || "bg-surface-variant"}`} />
                    <span className="text-[10px] uppercase tracking-wide text-on-surface-variant font-medium">
                      {TIPO_LABEL[f.tipo] || f.tipo}
                    </span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant flex-shrink-0">
                    {formatDistance(f.distance_m)}
                  </span>
                </div>
                <div className="mt-0.5 text-sm font-medium text-on-surface truncate" title={f.nombre}>
                  {f.nombre}
                </div>
                {Object.keys(f.properties).length > 0 && (
                  <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
                    {Object.entries(f.properties)
                      .filter(([, v]) => v !== null && v !== "" && v !== 0)
                      .slice(0, 4)
                      .map(([k, v]) => (
                        <React.Fragment key={k}>
                          <dt className="text-on-surface-variant">{k}:</dt>
                          <dd className="text-on-surface">{formatPropertyValue(v)}</dd>
                        </React.Fragment>
                      ))}
                  </dl>
                )}
                {f.tipo === "predio" && (
                  <a
                    href={`/predios/${f.id}`}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Ver ficha <ExternalLink className="size-3" />
                  </a>
                )}
                {f.tipo === "propuesta" && (
                  <a
                    href={`/intervenciones/${f.id}`}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Ver intervención <ExternalLink className="size-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
