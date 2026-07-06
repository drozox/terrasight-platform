"use client";

// =============================================================================
// Dropdown inline para editar el estado de una intervención (HU-TC-04).
// Re-renderea vía router.refresh() tras el cambio para traer la fila nueva.
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cambiarEstadoIntervencionAction } from "./actions";
import type { EstadoIntervencion } from "@/lib/repository";

const ESTADOS: EstadoIntervencion[] = ["Pendiente", "En ejecución", "Finalizada"];

const ESTILO: Record<EstadoIntervencion, string> = {
  "Pendiente":    "border-on-surface-variant/40 bg-surface-container-highest text-on-surface-variant",
  "En ejecución": "border-warning/40 bg-warning/10 text-warning",
  "Finalizada":   "border-primary/40 bg-primary/10 text-primary",
};

export function EstadoIntervencionDropdown({
  idPropuesta,
  estado,
  canEdit,
}: {
  idPropuesta: number;
  estado: EstadoIntervencion;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevo = e.target.value;
    if (nuevo === estado) return;
    if (!confirm(`¿Cambiar estado de la intervención #${idPropuesta} a "${nuevo}"?`)) {
      e.target.value = estado; // revert
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.set("idPropuesta", String(idPropuesta));
    fd.set("estado", nuevo);
    const res = await cambiarEstadoIntervencionAction(fd);
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      alert(res.message);
      e.target.value = estado;
    }
  }

  if (!canEdit) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ESTILO[estado]}`}
      >
        {estado}
      </span>
    );
  }

  return (
    <label className="relative inline-flex items-center">
      <select
        defaultValue={estado}
        onChange={onChange}
        disabled={busy}
        className={`cursor-pointer appearance-none rounded-full border px-2 py-0.5 pr-6 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-primary ${ESTILO[estado]} disabled:opacity-50`}
      >
        {ESTADOS.map((e) => (
          <option key={e} value={e}>{e}</option>
        ))}
      </select>
      {busy && (
        <Loader2 className="ml-1 size-3 animate-spin text-on-surface-variant" />
      )}
    </label>
  );
}
