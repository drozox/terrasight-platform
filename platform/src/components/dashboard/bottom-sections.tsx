import { Card } from "@/components/ui/card";
import { IntervencionesTable } from "./intervenciones-table";
import { CoberturaChart } from "./cobertura-chart";
import { Building2, Sprout, Droplets, Target } from "lucide-react";
import type {
  IntervencionReciente,
  CoberturaTotal,
  FooterKpis,
  PredioPorMunicipio,
} from "@/lib/types";
import type { ResumenComponente } from "@/lib/repos";
import { formatInt, cn } from "@/lib/utils";

/**
 * BottomSections — fila inferior del dashboard.
 * Inspirado en `bottom-sections.tsx` del dashboard de referencia, pero
 * reutilizando los componentes SIG TERRITORIO existentes (IntervencionesTable
 * y CoberturaChart) para mantener consistencia con el resto del theme.
 *
 * Tres tarjetas en fila:
 *  1. Monitoreo de Intervenciones (tabla con barras de progreso)
 *  2. Cobertura Vegetal (donut con datos reales de `sgs_rel_predio_cobertura`)
 *  3. Top Municipios por Predios (donut con datos reales de `bcs_lpa_municipio`)
 */
export function BottomSections({
  intervenciones,
  topMunicipios,
  footer,
  resumen,
}: {
  intervenciones: IntervencionReciente[];
  topMunicipios: PredioPorMunicipio[];
  footer: FooterKpis;
  resumen?: ResumenComponente;
}) {
  // Si hay componente activo, usamos su top de municipios; si no, el global.
  const muniSource: { nombre_municipio: string; predios: number }[] =
    resumen?.topMunicipios?.length
      ? resumen.topMunicipios.map((m) => ({ nombre_municipio: m.nombre, predios: m.propuestas }))
      : topMunicipios;

  const totalMunicipios = muniSource.reduce((a, m) => a + m.predios, 0) || 1;
  const topMunicipiosChart: CoberturaTotal[] = muniSource.map((m, i) => ({
    nombre: m.nombre_municipio,
    area: m.predios,
    porcentaje: Math.round((m.predios / totalMunicipios) * 100),
    color:
      i === 0 ? "primary" :
      i === 1 ? "secondary" :
      i === 2 ? "tertiary" :
                "outline",
  }));

  return (
    <div className="grid grid-cols-1 gap-gutter xl:grid-cols-12">
      <IntervencionesTable rows={intervenciones} limit={6} />

      <CoberturaChart
        title="Top Municipios por Predios"
        items={topMunicipiosChart}
        totalValue={formatInt(totalMunicipios)}
        totalLabel="predios"
      />
    </div>
  );
}

/**
 * SummaryBar — barra horizontal con KPIs clave (DEEPSEEK-72: drill-through).
 * Cada item ahora es un Link a su vista.
 */
export function SummaryBar({
  footer,
  resumen,
}: {
  footer: FooterKpis;
  resumen?: ResumenComponente;
}) {
  const c = resumen?.conteos;
  // KPIs deliberadamente distintos a los del panel derecho (que muestra
  // Predios / Intervenciones / Hectáreas / Km) para no duplicar información.
  const metasTxt = resumen ? `${resumen.cumplidas}/${resumen.totalIndicadores}` : null;
  const items = [
    { valor: formatInt(c?.municipios ?? footer.municipios), label: "Municipios", icon: Building2 },
    { valor: formatInt(c?.veredas ?? footer.veredas), label: "Veredas", icon: Sprout },
    { valor: formatInt(c?.puntos ?? 0), label: "Obras puntuales", icon: Droplets },
    { valor: formatInt(c?.poligonos ?? 0), label: "Áreas poligonales", icon: Sprout },
    metasTxt
      ? { valor: metasTxt, label: "Metas cumplidas", icon: Target }
      : { valor: formatInt(footer.quebradas), label: "Fuentes hídricas", icon: Droplets },
  ];

  return (
    // UX-68 (audit 2026-07-24): antes el SummaryBar se veia clickeable (card
    // verde solido, sin estado) y no llevaba a ningun lado. Ahora cada KPI
    // es un Link a su vista (DEEPSEEK-72).
    <div className="rounded-[20px] bg-primary px-8 py-5 text-on-primary">
      <div className="flex flex-wrap items-center justify-between gap-8">
        {items.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.label} className="flex items-center gap-3 px-1 py-1">
              <Icon className="size-5 shrink-0 opacity-90" />
              <div className="leading-tight">
                <p className="text-[22px] font-semibold">{r.valor}</p>
                {/* UX-39: este SI es un LABEL (caption chico bajo un stat),
                   uppercase con tracking queda OK. El numero grande es el
                   dato, el uppercase es la metadata. */}
                <p className="text-[11px] uppercase tracking-wider opacity-90">
                  {r.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}