"use client";

// =============================================================================
// PanelToggles (barra lateral derecha, solo íconos) + PanelGate.
// Cada ícono prende/apaga un panel de INICIO; tooltip nativo con el nombre.
// La preferencia se guarda en localStorage y se comparte vía evento de window.
// =============================================================================

import * as React from "react";
import {
  BarChart3,
  Target,
  TrendingUp,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PanelId = "indicadores" | "metas" | "franja" | "avance" | "atencion";

const PANELS: { id: PanelId; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "indicadores", label: "Indicadores generales", Icon: BarChart3 },
  { id: "metas", label: "Metas del convenio", Icon: Target },
  { id: "avance", label: "Avance del proyecto", Icon: TrendingUp },
  { id: "atencion", label: "Requiere atención", Icon: AlertTriangle },
  { id: "franja", label: "Franja de indicadores", Icon: Building2 },
];

const KEY = "inicio.panels";
const EVT = "inicio-panels-change";

function readState(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function PanelToggles() {
  const [state, setState] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setState(readState());
    const onChange = () => setState(readState());
    window.addEventListener(EVT, onChange);
    return () => window.removeEventListener(EVT, onChange);
  }, []);

  function toggle(id: PanelId) {
    const cur = readState();
    const next = { ...cur, [id]: !(cur[id] !== false) };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVT));
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest/95 p-2 shadow-lg backdrop-blur"
      role="toolbar"
      aria-label="Mostrar u ocultar paneles"
    >
      {PANELS.map((p) => {
        const on = state[p.id] !== false;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            title={p.label}
            aria-label={p.label}
            aria-pressed={on}
            className={cn(
              "flex size-10 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              on
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
            )}
          >
            <p.Icon className="size-5" />
          </button>
        );
      })}
    </div>
  );
}

export function PanelGate({ id, children }: { id: PanelId; children: React.ReactNode }) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const update = () => setVisible(readState()[id] !== false);
    update();
    window.addEventListener(EVT, update);
    return () => window.removeEventListener(EVT, update);
  }, [id]);

  if (!visible) return null;
  return <>{children}</>;
}
