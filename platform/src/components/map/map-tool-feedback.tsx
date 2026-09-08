"use client";

// =============================================================================
// MapToolFeedback — toast inline en la esquina superior derecha del mapa.
//
// UX-11/MapTools (audit 2026-07-24): antes mostraba "Próximamente" para los
// tools no implementados. Después del Sprint 18, todas las herramientas del
// toolbar están implementadas y muestran resultado en su panel propio
// (MapResultPanel, MapIdentifyPanel, MapBufferPanel, MapSpatialSelectPanel).
//
// Ahora el feedback es un "instructor" corto: nombre del tool + instrucción
// de uso + auto-dismiss a 6s (UX-44). Cero "próximamente".
// =============================================================================

import * as React from "react";
import {
  Ruler,
  SquareCheck,
  PencilLine,
  Bookmark,
  BoxSelect,
  X,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ToolKey = "measure" | "select" | "draw" | "markers" | "bbox";

const TOOL_META: Record<ToolKey, { icon: typeof Ruler; title: string; description: string }> = {
  measure: {
    icon: Ruler,
    title: "Medir distancia",
    description: "Click en dos o más puntos del mapa. PostGIS calcula la distancia geodésica total y muestra el segmento en el panel.",
  },
  select: {
    icon: SquareCheck,
    title: "Identificar feature",
    description: "Click en el mapa para ver las features cercanas (predio, propuesta, vía, drenaje, municipio, vereda).",
  },
  draw: {
    icon: PencilLine,
    title: "Medir área",
    description: "Click en tres o más puntos del mapa para definir un polígono. PostGIS devuelve el área en hectáreas.",
  },
  markers: {
    icon: Bookmark,
    title: "Buffer",
    description: "Click en un punto del mapa. PostGIS dibuja un buffer geodésico y cuenta features por capa.",
  },
  bbox: {
    icon: BoxSelect,
    title: "Selección por rectángulo",
    description: "Click en dos esquinas opuestas del rectángulo. PostGIS cuenta features de 11 capas dentro del bbox.",
  },
};

const AUTO_DISMISS_MS = 6000;

export function MapToolFeedback({
  tool,
  onClose,
}: {
  tool: ToolKey | null;
  onClose: () => void;
}) {
  // Auto-dismiss: el usuario no tiene que cerrar manualmente cada vez.
  React.useEffect(() => {
    if (!tool) return;
    const t = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [tool, onClose]);

  if (!tool) return null;

  const meta = TOOL_META[tool];
  const Icon = meta.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={meta.title}
      className={cn(
        "pointer-events-auto absolute right-4 top-4 z-[700] w-72 max-w-[calc(100vw-2rem)]",
        "rounded-xl border border-outline-variant/50 bg-surface-container-lowest/98 p-4 shadow-2xl backdrop-blur",
        "animate-in fade-in slide-in-from-top-1",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-label-lg font-bold text-on-surface">{meta.title}</p>
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary"
              title="Herramienta disponible"
            >
              <CheckCircle2 className="size-2.5" />
              disponible
            </span>
          </div>
          <p className="mt-1 text-body-sm leading-snug text-on-surface-variant">
            {meta.description}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {/* Progress bar del auto-dismiss (UX-44: feedback visual claro) */}
      <div
        className="mt-2 h-0.5 overflow-hidden rounded-full bg-surface-container"
        aria-hidden="true"
      >
        <div
          className="h-full bg-primary/60"
          style={{
            animation: `map-tool-feedback-progress ${AUTO_DISMISS_MS}ms linear forwards`,
          }}
        />
      </div>
      <style>{`
        @keyframes map-tool-feedback-progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes map-tool-feedback-progress { from, to { width: 100%; } }
        }
      `}</style>
    </div>
  );
}
