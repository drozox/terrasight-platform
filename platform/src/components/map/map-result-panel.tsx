// =============================================================================
// MapResultPanel — panel flotante con el resultado de la medición activa
//
// Se muestra arriba a la derecha cuando hay una herramienta de medición
// activa. Llama al endpoint /api/geo/measure (PostGIS) para el ground
// truth y muestra el resultado con formato amigable.
// =============================================================================

"use client";

import * as React from "react";
import { Ruler, Square, X, Loader2 } from "lucide-react";
import type { MapInteraction, LngLat } from "./map-types";
import { formatMeters, formatHectares } from "@/lib/geo/measure";

type MeasureState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: { length_m: number; area_m2: number; points: number } }
  | { status: "error"; message: string };

export function MapResultPanel({
  interaction,
  onClear,
}: {
  interaction: MapInteraction;
  onClear: () => void;
}) {
  const [state, setState] = React.useState<MeasureState>({ status: "idle" });

  // Determinar si mostrar el panel
  const isMeasure =
    interaction.kind === "measure-distance" || interaction.kind === "measure-area";
  const minPoints =
    interaction.kind === "measure-area" ? 3 : 2;
  const hasMinPoints = "points" in interaction && interaction.points.length >= minPoints;

  // Llamar al endpoint cuando cambien los puntos
  React.useEffect(() => {
    if (!isMeasure || !hasMinPoints) {
      setState({ status: "idle" });
      return;
    }
    if (!("points" in interaction)) return;
    const points = interaction.points;
    let cancelled = false;
    setState({ status: "loading" });
    fetch("/api/geo/measure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points,
        kind: interaction.kind === "measure-distance" ? "distance" : "area",
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setState({ status: "error", message: data.error });
        } else {
          setState({
            status: "ok",
            data: {
              length_m: data.length_m,
              area_m2: data.area_m2,
              points: data.points,
            },
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [isMeasure, hasMinPoints, interaction]);

  if (!isMeasure) return null;

  const Icon = interaction.kind === "measure-distance" ? Ruler : Square;
  const title =
    interaction.kind === "measure-distance" ? "Medición de distancia" : "Medición de área";
  const description =
    interaction.kind === "measure-distance"
      ? "Haz click en el mapa para agregar puntos a la línea."
      : "Haz click en el mapa para agregar vértices al polígono (mín. 3).";

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-[700] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-outline-variant/50 bg-surface-container-lowest/98 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Cerrar herramienta de medición"
          className="rounded p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="text-xs text-on-surface-variant mb-3">{description}</p>

      {"points" in interaction && (
        <div className="text-xs text-on-surface-variant mb-3">
          {interaction.points.length} punto{interaction.points.length === 1 ? "" : "s"} cliqueado{interaction.points.length === 1 ? "" : "s"}
          {!hasMinPoints && (
            <span className="text-amber-700"> · faltan {minPoints - interaction.points.length}</span>
          )}
        </div>
      )}

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Loader2 className="size-3 animate-spin" />
          Calculando…
        </div>
      )}

      {state.status === "error" && (
        <div className="text-xs text-red-700" role="alert">
          Error: {state.message}
        </div>
      )}

      {state.status === "ok" && state.data && (
        <div className="space-y-1.5">
          {interaction.kind === "measure-distance" && (
            <div>
              <div className="text-xs text-on-surface-variant">Distancia total</div>
              <div className="text-xl font-bold text-on-surface font-mono">
                {formatMeters(state.data.length_m)}
              </div>
            </div>
          )}
          {interaction.kind === "measure-area" && (
            <>
              <div>
                <div className="text-xs text-on-surface-variant">Área</div>
                <div className="text-xl font-bold text-on-surface font-mono">
                  {formatHectares(state.data.area_m2)}
                </div>
              </div>
              <div className="text-xs text-on-surface-variant">
                Perímetro: <span className="font-mono">{formatMeters(state.data.length_m)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {state.status === "idle" && (
        <div className="text-xs text-on-surface-variant italic">
          Esperando puntos…
        </div>
      )}
    </div>
  );
}
