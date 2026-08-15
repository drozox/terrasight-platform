"use client";

// =============================================================================
// MapToolFeedback — toast inline en la esquina superior derecha del mapa.
//
// UX-11/MapTools (audit 2026-07-24): los 4 tools del MapTools (Medir
// distancia, Seleccionar feature, Dibujar anotacion, Marcadores guardados)
// solo seteaban `activeTool` en state pero no hacian NADA. El usuario
// clickeaba y nada pasaba — UI placebo.
//
// Fix: cuando el usuario selecciona un tool que no esta implementado,
// aparece un toast inline con:
//  - Icono del tool + titulo
//  - Mensaje "Proximamente" + copy de que viene en el roadmap
//  - Boton "Entendido" para cerrar
//  - Auto-dismiss a los 5s (UX-44 dice < 6s para toasts informativos)
//
// Para tools implementados (futuro: measure con Leaflet.draw, etc) el
// feedback cambia y muestra resultados. Por ahora todos son "próximamente".
// =============================================================================

import * as React from "react";
import {
  Ruler,
  SquareCheck,
  PencilLine,
  Bookmark,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ToolKey = "measure" | "select" | "draw" | "markers";

const TOOL_META: Record<ToolKey, { icon: typeof Ruler; title: string; description: string; eta: string }> = {
  measure: {
    icon: Ruler,
    title: "Medir distancia",
    description: "Click en dos puntos del mapa para ver la distancia geodésica. PostGIS calcula el segmento y dibuja la línea.",
    eta: "Próxima fase · Q3",
  },
  select: {
    icon: SquareCheck,
    title: "Seleccionar feature",
    description: "Click en un predio, quebrada o área protegida para abrir su ficha con atributos, fotos y reportes asociados.",
    eta: "Próxima fase · Q3",
  },
  draw: {
    icon: PencilLine,
    title: "Dibujar anotación",
    description: "Anotaciones temporales (flechas, polígonos, texto) para destacar zonas en una vista compartida con el equipo.",
    eta: "Próxima fase · Q4",
  },
  markers: {
    icon: Bookmark,
    title: "Marcadores guardados",
    description: "Guarda la vista actual (centro + zoom + capas activas) con un nombre y recargarala desde cualquier dispositivo.",
    eta: "Próxima fase · Q4",
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
              className="inline-flex items-center gap-0.5 rounded-full bg-tertiary-container/40 px-1.5 py-0.5 text-[9px] font-bold uppercase text-tertiary"
              title="Próximamente en el roadmap"
            >
              <Sparkles className="size-2.5" />
              {meta.eta}
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
