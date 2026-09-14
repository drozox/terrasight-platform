// =============================================================================
// MetasStrip — resumen de los 10 indicadores del convenio para el dashboard.
// Fuente única: getIndicadoresFlat() (vistas sgs_v_indicador_*). Server component.
// =============================================================================

import Link from "next/link";
import { Target, ArrowRight } from "lucide-react";
import { getIndicadoresFlat, INDICADORES_META, type IndicadorKey } from "@/lib/repos/metas-convenio";

export async function MetasStrip() {
  const flat = await getIndicadoresFlat();
  const keys = Object.keys(INDICADORES_META) as IndicadorKey[];
  const cumplidas = keys.filter((k) => flat[k].cumplida).length;

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="size-4" />
          </span>
          <div>
            <h2 className="text-title-md font-bold text-on-surface">Metas del convenio</h2>
            <p className="text-[11px] text-on-surface-variant">
              {cumplidas} de {keys.length} metas cumplidas
            </p>
          </div>
        </div>
        <Link
          href="/metas/convenio"
          className="inline-flex items-center gap-1 text-label-lg font-bold text-primary hover:underline"
        >
          Ver detalle <ArrowRight className="size-3.5" />
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {keys.map((k) => {
          const m = INDICADORES_META[k];
          const v = flat[k];
          const fill = v.cumplida ? "bg-primary" : v.pct >= 50 ? "bg-info" : "bg-warning";
          return (
            <div key={k} className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-3">
              <p className="truncate text-[11px] text-on-surface-variant" title={m.label}>
                {m.label}
              </p>
              <p className="mt-1 text-lg font-bold leading-none text-on-surface">
                {v.actual.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                <span className="ml-1 text-[11px] font-normal text-on-surface-variant">
                  / {m.meta} {m.unidad}
                </span>
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-variant/40">
                <div className={`h-full ${fill}`} style={{ width: `${Math.min(100, v.pct)}%` }} />
              </div>
              <p className={`mt-1 text-[10px] font-bold ${v.cumplida ? "text-primary" : "text-on-surface-variant"}`}>
                {v.pct}%{v.cumplida ? " · cumplida" : ""}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
