// =============================================================================
// ComparativaComponentes — vista de C1 / C2 / C3 en VERTICAL (una debajo de
// otra) para que el texto y el % nunca se desborden.
// Usa los datos ya cargados en el dashboard (componentes + avances).
// =============================================================================

import { cn } from "@/lib/utils";
import type { ComponenteTotal } from "@/lib/types";
import type { AvanceComponente, ComponenteKey } from "@/lib/repos";

const COMPS: ComponenteKey[] = ["C1", "C2", "C3"];

const TINT: Record<ComponenteKey, { bar: string; text: string; bg: string; label: string }> = {
  C1: { bar: "bg-primary", text: "text-primary", bg: "bg-primary/10", label: "Componente 1" },
  C2: { bar: "bg-secondary", text: "text-secondary", bg: "bg-secondary/10", label: "Componente 2" },
  C3: { bar: "bg-tertiary", text: "text-tertiary", bg: "bg-tertiary/10", label: "Componente 3" },
};

export function ComparativaComponentes({
  componentes,
  avances,
}: {
  componentes: ComponenteTotal[];
  avances: Record<ComponenteKey, AvanceComponente>;
}) {
  const totales = COMPS.map((c) => componentes.find((x) => x.nombre === c)?.total ?? 0);

  return (
    <section className="rounded-[20px] border border-outline-variant bg-surface-container-lowest p-6">
      <header className="mb-6">
        <h2 className="text-[20px] font-semibold text-on-surface">Comparativa por componente</h2>
        <p className="mt-1 text-[13px] text-on-surface-variant">
          Avance de metas e intervenciones de los tres componentes en una sola vista.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {COMPS.map((c, i) => {
          const av = avances[c];
          const total = totales[i];
          const t = TINT[c];
          const pct = Math.min(100, av?.pct ?? 0);
          return (
            <div key={c} className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <span className={cn("rounded-md px-2.5 py-1 text-[12px] font-bold", t.bg, t.text)}>
                  {t.label}
                </span>
                <div className="flex items-center gap-4 text-[12px] text-on-surface-variant">
                  <span>
                    Metas: <span className="font-bold text-on-surface">{av?.cumplidas ?? 0}/{av?.total ?? 0}</span>
                  </span>
                  <span>
                    Interv: <span className="font-bold text-on-surface">{total.toLocaleString("es-CO")}</span>
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-variant/40">
                  <div className={cn("h-full", t.bar)} style={{ width: `${pct}%` }} />
                </div>
                <span className={cn("w-12 shrink-0 text-right text-[13px] font-bold", t.text)}>
                  {av?.pct ?? 0}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
