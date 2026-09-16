"use client";

// =============================================================================
// ReporteFiltrosBar — filtros por COMPONENTE y ACCIÓN para los reportes que lo
// soportan (R1, R2, R4, R6). Al cambiar, actualiza la URL (?componente&accion)
// y el server re-renderiza la tabla.
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { type AccionCode } from "@/lib/acciones";
import type { ReporteTipo } from "@/lib/types";

const COMPONENTES = ["C1", "C2", "C3"] as const;

const ACCIONES_POR: Record<string, AccionCode[]> = {
  C1: ["C1A1", "C1A2"],
  C2: ["C2A1", "C2A2"],
  C3: ["C3AU"],
};

export function ReporteFiltrosBar({
  tipo,
  componente,
  accion,
}: {
  tipo: ReporteTipo;
  componente: string | null;
  accion: AccionCode | null;
}) {
  const router = useRouter();

  function push(next: { componente: string | null; accion: string | null }) {
    const params = new URLSearchParams();
    params.set("tipo", tipo);
    if (next.componente) params.set("componente", next.componente);
    if (next.accion) params.set("accion", next.accion);
    router.push(`/reportes?${params.toString()}`);
  }

  const accionesDisponibles = componente ? ACCIONES_POR[componente] ?? [] : [];

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xl print:hidden">
      <label className="flex flex-col">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">
          Componente
        </span>
        <div className="relative">
          <select
            value={componente ?? ""}
            onChange={(e) => push({ componente: e.target.value || null, accion: null })}
            className="h-10 w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-3 pr-10 text-sm font-bold text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todos</option>
            {COMPONENTES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
        </div>
      </label>

      <label className="flex flex-col">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">
          Acción
        </span>
        <div className="relative">
          <select
            value={accion ?? ""}
            disabled={!componente}
            onChange={(e) => push({ componente, accion: e.target.value || null })}
            className="h-10 w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-3 pr-10 text-sm font-bold text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Todas</option>
            {accionesDisponibles.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
        </div>
      </label>
    </div>
  );
}
