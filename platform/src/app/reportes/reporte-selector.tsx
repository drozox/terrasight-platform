"use client";

// =============================================================================
// Selector de reporte — actualiza la URL con ?tipo=Rx al cambiar la opción.
// =============================================================================

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { REPORTE_LABELS } from "@/lib/constants";
import type { ReporteTipo } from "@/lib/types";

export function ReporteSelector({ tipoInicial }: { tipoInicial: ReporteTipo }) {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search?.get("callbackUrl");
  const [tipo, setTipo] = React.useState<ReporteTipo>(tipoInicial);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as ReporteTipo;
    setTipo(next);
    const params = new URLSearchParams();
    params.set("tipo", next);
    if (callbackUrl) params.set("callbackUrl", callbackUrl);
    router.push(`/reportes?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <label className="flex flex-1 flex-col">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">
          Reporte
        </span>
        <div className="relative">
          <select
            value={tipo}
            onChange={onChange}
            className="h-11 w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-3 pr-10 text-sm font-bold text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {(Object.keys(REPORTE_LABELS) as ReporteTipo[]).map((t) => (
              <option key={t} value={t}>{REPORTE_LABELS[t]}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
        </div>
      </label>
    </div>
  );
}
