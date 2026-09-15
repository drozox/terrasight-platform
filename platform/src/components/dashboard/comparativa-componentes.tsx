// =============================================================================
// ComparativaComponentes — vista lado a lado de C1 / C2 / C3 (DEEPSEEK-F6).
// Usa los datos ya cargados en el dashboard (componentes + avances), sin
// queries extra. Siempre muestra los 3, independiente del filtro activo.
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
  const maxTotal = Math.max(1, ...totales);

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <header className="mb-3">
        <h2 className="text-title-md font-bold text-on-surface">Comparativa por componente</h2>
        <p className="text-[11px] text-on-surface-variant">
          Avance de metas e intervenciones de los tres componentes en una sola vista.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {COMPS.map((c, i) => {
          const av = avances[c];
          const total = totales[i];
          const t = TINT[c];
          return (
            <div key={c} className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-3">
              <div className="flex items-center justify-between">
                <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold", t.bg, t.text)}>
                  {t.label}
                </span>
                <span className={cn("text-xl font-bold leading-none", t.text)}>
                  {av?.pct ?? 0}%
                </span>
              </div>

              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-variant/40">
                <div className={cn("h-full", t.bar)} style={{ width: `${av?.pct ?? 0}%` }} />
              </div>

              <dl className="mt-3 space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <dt className="text-on-surface-variant">Metas cumplidas</dt>
                  <dd className="font-bold text-on-surface">
                    {av?.cumplidas ?? 0}/{av?.total ?? 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-on-surface-variant">Intervenciones</dt>
                  <dd className="font-bold text-on-surface">{total.toLocaleString("es-CO")}</dd>
                </div>
              </dl>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-variant/30">
                <div
                  className={cn("h-full", t.bar)}
                  style={{ width: `${Math.round((total / maxTotal) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
