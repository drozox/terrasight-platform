"use client";

// =============================================================================
// PanelToggles + PanelGate — barra de comandos para mostrar/ocultar paneles de
// INICIO. La preferencia se guarda en localStorage y se comparte vía un evento
// de window, de modo que PanelGate (que envuelve paneles server) reaccione.
// =============================================================================

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type PanelId = "indicadores" | "metas" | "franja" | "avance" | "atencion";

const PANELS: { id: PanelId; label: string }[] = [
  { id: "indicadores", label: "Indicadores generales" },
  { id: "metas", label: "Metas del convenio" },
  { id: "franja", label: "Franja de indicadores" },
  { id: "avance", label: "Avance del proyecto" },
  { id: "atencion", label: "Requiere atención" },
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
    <div className="flex items-center gap-3 overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-3">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
        Paneles
      </span>
      {PANELS.map((p) => {
        const on = state[p.id] !== false;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            aria-pressed={on}
            className={cn(
              "inline-flex h-[38px] shrink-0 items-center gap-2 rounded-full px-[18px] text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              on
                ? "bg-primary text-on-primary"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container",
            )}
          >
            {on ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            {p.label}
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
