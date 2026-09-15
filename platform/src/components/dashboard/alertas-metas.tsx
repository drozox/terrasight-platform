// =============================================================================
// AlertasMetas — "Requiere atención" (patrón Alerts del skill kpi-dashboard-design).
// Lista los indicadores del componente activo que NO están cumplidos, ordenados
// de peor a mejor (drilldown accionable). Si todo está cumplido, lo celebra.
// =============================================================================

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IndicadorResumen } from "@/lib/repos";
import { ESTADO_BAR, ESTADO_LABEL, ESTADO_TEXT } from "@/lib/estado-indicador";

export function AlertasMetas({ indicadores }: { indicadores: IndicadorResumen[] }) {
  const pendientes = indicadores
    .filter((i) => !i.cumplida)
    .sort((a, b) => a.pct - b.pct);
  const atrasadas = pendientes.filter((i) => i.estado === "atrasada").length;

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <header className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            pendientes.length ? "bg-warning/10 text-warning" : "bg-success/10 text-success",
          )}
        >
          {pendientes.length ? (
            <AlertTriangle className="size-4" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          )}
        </span>
        <div>
          <h2 className="text-title-md font-bold text-on-surface">Requiere atención</h2>
          <p className="text-[11px] text-on-surface-variant">
            {pendientes.length === 0
              ? "Todas las metas del componente están cumplidas."
              : `${pendientes.length} meta(s) por cumplir${
                  atrasadas ? ` · ${atrasadas} en rojo (<50%)` : ""
                }`}
          </p>
        </div>
      </header>

      {pendientes.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {pendientes.slice(0, 6).map((ind) => (
            <li
              key={ind.key}
              className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-2.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="truncate text-[12px] font-semibold text-on-surface"
                  title={ind.label}
                >
                  {ind.label}
                </span>
                <span className={cn("shrink-0 text-[11px] font-bold", ESTADO_TEXT[ind.estado])}>
                  {ind.pct}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-variant/40">
                <div
                  className={cn("h-full", ESTADO_BAR[ind.estado])}
                  style={{ width: `${Math.min(100, ind.pct)}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-on-surface-variant">
                {ind.actual.toLocaleString("es-CO", { maximumFractionDigits: 2 })} / {ind.meta}{" "}
                {ind.unidad} · {ESTADO_LABEL[ind.estado]}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
