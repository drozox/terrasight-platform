import { Card } from "@/components/ui/card";
import { IntervencionesTable } from "./intervenciones-table";
import { CoberturaChart } from "./cobertura-chart";
import { Building2, Sprout, Droplets } from "lucide-react";
import type {
  IntervencionReciente,
  CoberturaTotal,
  FooterKpis,
  PredioPorMunicipio,
} from "@/lib/types";
import { formatInt, formatHa, cn } from "@/lib/utils";
import Link from "next/link";

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
  cobertura,
  topMunicipios,
  footer,
}: {
  intervenciones: IntervencionReciente[];
  cobertura: CoberturaTotal[];
  topMunicipios: PredioPorMunicipio[];
  footer: FooterKpis;
}) {
  // Adaptar PredioPorMunicipio a CoberturaTotal para reutilizar CoberturaChart
  const totalMunicipios = topMunicipios.reduce((a, m) => a + m.predios, 0) || 1;
  const topMunicipiosChart: CoberturaTotal[] = topMunicipios.map((m, i) => ({
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
        title="Cobertura Vegetal"
        items={cobertura}
        totalValue={`${formatHa(footer.hectareasIntervenidas)}`}
        totalLabel="ha total"
      />

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
 * SummaryBar — barra horizontal con KPIs clave.
 * Inspirado en `SummaryBar` del dashboard de referencia, adaptado a tokens
 * SIG TERRITORIO (primary en lugar del verde del cliente).
 */
export function SummaryBar({ footer }: { footer: FooterKpis }) {
  const items = [
    { valor: formatInt(footer.municipios),    label: "Municipios",            icon: Building2 },
    { valor: formatInt(footer.veredas),       label: "Veredas",               icon: Sprout },
    { valor: formatInt(footer.predios),       label: "Predios Concertados",   icon: Building2 },
    { valor: formatHa(footer.hectareasIntervenidas), label: "Hectáreas Intervenidas", icon: Sprout },
    { valor: formatInt(footer.quebradas),     label: "Fuentes Hídricas",      icon: Droplets },
  ];

  return (
    // UX-68 (audit 2026-07-24): antes el SummaryBar se veia clickeable (card
    // verde solido, sin estado) y no llevaba a ningun lado. Ahora es un
    // Link al dashboard analitico (cuando exista) con aria-label descriptivo
    // y hover sutil. Sigue funcionando como informacion visual.
    <Link
      href="/dashboard"
      aria-label="Ver resumen de indicadores del convenio"
      className="block rounded-xl bg-primary p-4 text-on-primary transition-[background-color,box-shadow] hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {items.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.label} className="flex items-center gap-3">
              <Icon className="size-6 shrink-0 opacity-90" />
              <div className="leading-tight">
                <p className="text-title-lg font-bold">{r.valor}</p>
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
    </Link>
  );
}