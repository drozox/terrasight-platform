"use client";

// =============================================================================
// Dropdown inline para editar el estado de una intervención (HU-TC-04).
//
// Sprint 23 (P0-1 del FINAL-CLOSURE-PLAN): unifica el vocabulario con la
// máquina de estados del workflow (Sprint 20). Los 6 valores coinciden con
// el CHECK constraint de `sgs_pro_propuesta.estado` (migration 33).
//
// Para la ficha detallada se prefiere <WorkflowPanel> que aplica
// `aplicarTransicion()` con auditoría en `sgs_pro_estado_historial`.
// Este dropdown queda como atajo rápido en el listado, con re-validación
// en backend vía isEstadoIntervencion().
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cambiarEstadoIntervencionAction } from "./actions";
import type { EstadoIntervencion } from "@/lib/types";

const ESTADOS: EstadoIntervencion[] = [
  "BORRADOR",
  "EN_REVISION",
  "APROBADA",
  "EN_EJECUCION",
  "FINALIZADA",
  "RECHAZADA",
];

const LABEL: Record<EstadoIntervencion, string> = {
  BORRADOR:     "Borrador",
  EN_REVISION:  "En revisión",
  APROBADA:     "Aprobada",
  EN_EJECUCION: "En ejecución",
  FINALIZADA:   "Finalizada",
  RECHAZADA:    "Rechazada",
};

const ESTILO: Record<EstadoIntervencion, string> = {
  BORRADOR:     "border-on-surface-variant/40 bg-surface-container-highest text-on-surface-variant",
  EN_REVISION:  "border-amber-400/40 bg-amber-50 text-amber-800",
  APROBADA:     "border-blue-400/40 bg-blue-50 text-blue-800",
  EN_EJECUCION: "border-emerald-400/40 bg-emerald-50 text-emerald-800",
  FINALIZADA:   "border-primary/40 bg-primary/10 text-primary",
  RECHAZADA:    "border-red-400/40 bg-red-50 text-red-800",
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
    const nuevo = e.target.value as EstadoIntervencion;
    if (nuevo === estado) return;
    if (!confirm(`¿Cambiar estado de la intervención #${idPropuesta} a "${LABEL[nuevo]}"?`)) {
      e.target.value = estado; // revert
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.set("idPropuesta", String(idPropuesta));
    fd.set("estado", nuevo);
    try {
      const res = await cambiarEstadoIntervencionAction(fd);
      if (res.ok) {
        router.refresh();
      } else {
        alert(res.message);
        e.target.value = estado;
      }
    } catch (err) {
      // No crashear la UI si el server action falla (red, auth, runtime).
      alert((err as Error).message ?? "Error al cambiar el estado.");
      e.target.value = estado;
    } finally {
      setBusy(false);
    }
  }

  if (!canEdit) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ESTILO[estado]}`}
      >
        {LABEL[estado]}
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
          <option key={e} value={e}>{LABEL[e]}</option>
        ))}
      </select>
      {busy && (
        <Loader2 className="ml-1 size-3 animate-spin text-on-surface-variant" />
      )}
    </label>
  );
}
