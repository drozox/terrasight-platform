"use client";

import * as React from "react";
import {
  Ruler,
  SquareCheck,
  PencilLine,
  Bookmark,
  Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MapTools — toolbar horizontal con herramientas SIG básicas.
 * Inspirado en `map-panel.tsx` del dashboard de referencia, adaptado al theme
 * TerraSight. Por ahora los handlers son no-op (visualmente preparados para
 * las próximas HU de análisis espacial).
 */

export type MapToolKey = "measure" | "select" | "draw" | "markers";

export function MapTools({
  onSelect,
  activeTool,
  onRecenter,
}: {
  onSelect: (tool: MapToolKey) => void;
  activeTool: MapToolKey | null;
  onRecenter: () => void;
}) {
  return (
    <div className="absolute bottom-4 left-1/2 z-[600] flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-outline-variant/40 bg-surface-container-lowest/95 px-1.5 py-1 shadow-lg backdrop-blur">
      <ToolButton
        icon={Ruler}
        label="Medir distancia"
        active={activeTool === "measure"}
        onClick={() => onSelect("measure")}
      />
      <ToolButton
        icon={SquareCheck}
        label="Seleccionar feature"
        active={activeTool === "select"}
        onClick={() => onSelect("select")}
      />
      <ToolButton
        icon={PencilLine}
        label="Dibujar anotación"
        active={activeTool === "draw"}
        onClick={() => onSelect("draw")}
      />
      <ToolButton
        icon={Bookmark}
        label="Marcadores guardados"
        active={activeTool === "markers"}
        onClick={() => onSelect("markers")}
      />
      <div className="mx-1 h-5 w-px bg-outline-variant/50" />
      <ToolButton
        icon={Crosshair}
        label="Recentrar a Cundinamarca"
        onClick={onRecenter}
      />
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={!!active}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
        active
          ? "bg-primary text-on-primary"
          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}