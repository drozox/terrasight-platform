"use client";

// =============================================================================
// Form para registrar un nuevo evento de avance (HU-IC-04).
//
// UX:
//   - Slider 0..100 con step=5 y label que muestra el % elegido.
//   - Textarea opcional para nota (max 2000 chars).
//   - Submit → `actualizarAvanceIntervencionAction`.
//   - On success: `onUpdate(msg)` (que dispara flash + router.refresh()).
//   - On error: `onError(msg)`.
//   - Si !canEdit: solo lectura — barra + % grande.
// =============================================================================

import * as React from "react";
import { Loader2, Save, TrendingUp, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { actualizarAvanceIntervencionAction } from "../actions";

export function AvanceForm({
  idPropuesta,
  avanceActual,
  canEdit,
  onUpdate,
  onError,
}: {
  idPropuesta: number;
  avanceActual: number;
  canEdit: boolean;
  onUpdate: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [pct, setPct] = React.useState<number>(avanceActual);
  const [busy, setBusy] = React.useState(false);

  // Re-sincronizar el slider si la propuesta cambia de % (router.refresh).
  React.useEffect(() => {
    setPct(avanceActual);
  }, [avanceActual]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    fd.set("idPropuesta", String(idPropuesta));
    fd.set("avancePct", String(pct));
    const res = await actualizarAvanceIntervencionAction(fd);
    setBusy(false);
    if (res.ok) onUpdate(res.message);
    else onError(res.message);
  }

  // ---- Modo lectura ----
  if (!canEdit) {
    return (
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase text-on-surface-variant">
              Avance actual
            </p>
            <p className="font-mono text-4xl font-bold text-primary">
              {pct}%
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
            <Lock className="size-3" />
            Solo lectura
          </div>
        </div>
        <ProgressBar pct={pct} />
      </div>
    );
  }

  // ---- Modo edición ----
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase text-on-surface-variant">
            Avance actual
          </p>
          <p className="font-mono text-4xl font-bold text-primary">{pct}%</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-[11px] font-bold uppercase text-on-surface-variant">
            Nuevo valor
          </p>
          <p className="font-mono text-2xl font-bold text-on-surface">{pct}%</p>
        </div>
      </div>

      <ProgressBar pct={pct} />

      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">
          Actualizar avance
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-outline-variant/40 accent-primary"
          aria-label="Porcentaje de avance"
        />
        <div className="mt-1 flex justify-between text-[10px] text-on-surface-variant">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </label>

      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">
          Nota de avance <span className="text-on-surface-variant">(opcional)</span>
        </span>
        <textarea
          name="nota"
          maxLength={2000}
          rows={3}
          placeholder="Describe brevemente el avance (visita a la finca, equipo asignado, evidencia subida, etc.)"
          className="block w-full resize-y rounded-lg border border-outline-variant bg-surface-container-highest px-3 py-2 text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>

      <div className="flex items-center justify-end gap-2 border-t border-outline-variant pt-3">
        <span className="mr-auto inline-flex items-center gap-1 text-[11px] text-on-surface-variant">
          <TrendingUp className="size-3" />
          Se registrará en el histórico con tu usuario.
        </span>
        <Button type="submit" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Guardando…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Registrar avance
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-outline-variant/40"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
