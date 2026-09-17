"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DonutChart } from "./donut-chart";
import { LineChart, type LineSeries } from "./line-chart";
import { formatInt, formatHa, cn } from "@/lib/utils";
import { TrendingUp, Building2, Activity, Map as MapIcon, Route } from "lucide-react";
import type {
  DashboardKpis,
  ComponenteTotal,
  FooterKpis,
  SerieTemporal,
} from "@/lib/types";
import type { ResumenComponente } from "@/lib/repos";
import { ESTADO_BAR } from "@/lib/estado-indicador";
import { PanelGate } from "./panel-toggles";
import type { ReactNode } from "react";

/**
 * RightPanel — columna derecha del dashboard, componente-céntrica.
 *  1. Avance del componente (gauge + indicadores)
 *  2. Indicadores del componente (KPIs)
 *  3. Intervenciones por componente (donut)
 *  4. Tendencia por componente
 */
export function RightPanel({
  kpis,
  componentes,
  footer,
  seriesComponentes,
  resumen,
  metasSlot,
}: {
  kpis: DashboardKpis;
  componentes: ComponenteTotal[];
  footer: FooterKpis;
  seriesComponentes?: Record<"C1" | "C2" | "C3", SerieTemporal[]>;
  resumen?: ResumenComponente;
  metasSlot?: ReactNode;
}) {
  const totalPropuestas = componentes.reduce((acc, c) => acc + c.total, 0) || 1;

  const donutPorComponente = [
    { label: "Componente 1", value: componentes.find((c) => c.nombre === "C1")?.total ?? 0, color: "primary" as const },
    { label: "Componente 2", value: componentes.find((c) => c.nombre === "C2")?.total ?? 0, color: "secondary" as const },
    { label: "Componente 3", value: componentes.find((c) => c.nombre === "C3")?.total ?? 0, color: "tertiary" as const },
  ];

  const c = resumen?.conteos;
  const indicadores = [
    { label: "Predios", valor: formatInt(c?.predios ?? kpis.predios), icon: Building2, tint: "primary" as const, delta: `${formatInt(c?.municipios ?? footer.municipios)} municipios`, href: "/predios" },
    { label: "Intervenciones", valor: formatInt(c?.propuestas ?? kpis.propuestas), icon: Activity, tint: "secondary" as const, delta: `${formatInt(c?.puntos ?? 0)} puntos`, href: "/intervenciones" },
    { label: "Hectáreas", valor: formatHa(c?.hectareas ?? kpis.hectareasPredios), icon: MapIcon, tint: "tertiary" as const, delta: `${formatInt(c?.poligonos ?? 0)} polígonos`, href: "/predios" },
    { label: "Kilómetros", valor: `${(c?.kilometros ?? 0).toLocaleString("es-CO", { maximumFractionDigits: 1 })} km`, icon: Route, tint: "primary" as const, delta: `${formatInt(c?.lineas ?? 0)} trazados`, href: "/intervenciones" },
  ];

  const tintBg: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    tertiary: "bg-tertiary/10 text-tertiary",
  };

  const lineSeries: LineSeries[] = seriesComponentes
    ? [
        { label: "C1", color: "primary", data: seriesComponentes.C1 },
        { label: "C2", color: "secondary", data: seriesComponentes.C2 },
        { label: "C3", color: "tertiary", data: seriesComponentes.C3 },
      ]
    : [];

  return (
    <aside className="flex h-full w-[360px] flex-shrink-0 flex-col gap-3 overflow-y-auto border-l border-outline-variant bg-surface p-3">
      {/* Ajuste 6: Metas del convenio vive en la columna derecha (slot). */}
      {metasSlot}

      {/* SECCIÓN 1 — Avance del componente */}
      {resumen && (
        <PanelGate id="avance">
        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-title-md font-bold text-on-surface">Avance del proyecto</h3>
            <span className="rounded-full bg-surface-variant/60 px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
              {resumen.etiqueta}
            </span>
          </div>
          <div className="mb-3 flex items-center gap-3">
            <span className="text-3xl font-bold leading-none text-primary">
              {resumen.pctGlobal}%
            </span>
            <div className="flex-1">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-variant/50">
                <div
                  className={cn(
                    "h-full",
                    resumen.pctGlobal >= 100 ? "bg-success" : resumen.pctGlobal >= 50 ? "bg-info" : "bg-warning",
                  )}
                  style={{ width: `${resumen.pctGlobal}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                {resumen.cumplidas} de {resumen.totalIndicadores} metas cumplidas
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {resumen.indicadores.map((ind) => (
              <li key={ind.key}>
                <div className="flex items-baseline justify-between gap-2 text-[11px]">
                  <span className="truncate text-on-surface-variant" title={ind.label}>
                    {ind.label}
                  </span>
                  <span className="shrink-0 font-bold text-on-surface">
                    {ind.actual.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                    <span className="font-normal text-on-surface-variant">
                      /{ind.meta} {ind.unidad}
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-variant/40">
                  <div
                    className={cn("h-full", ESTADO_BAR[ind.estado])}
                    style={{ width: `${Math.min(100, ind.pct)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
        </PanelGate>
      )}

      {/* SECCIÓN 2 — Indicadores del componente */}
      <PanelGate id="indicadores">
      <Card className="p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-title-md font-bold text-on-surface">Indicadores</h3>
          <Link href="/metas/convenio" className="text-[11px] font-bold text-primary hover:underline">
            Ver reporte
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {indicadores.map((ind) => {
            const Icon = ind.icon;
            return (
              <Link
                key={ind.label}
                href={ind.href}
                aria-label={`Ver ${ind.label}`}
                className="block rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", tintBg[ind.tint])}>
                    <Icon className="size-4" />
                  </span>
                  <span className="text-[10px] font-bold uppercase leading-tight text-on-surface-variant">
                    {ind.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold leading-none text-on-surface">{ind.valor}</span>
                </div>
                <p className="mt-1 text-[10px] leading-tight text-on-surface-variant">{ind.delta}</p>
              </Link>
            );
          })}
        </div>
      </Card>
      </PanelGate>

      {/* SECCIÓN 3 — Intervenciones por componente */}
      <Card className="p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-title-md font-bold text-on-surface">Intervenciones por componente</h3>
        </div>
        <div className="flex items-center gap-3">
          <DonutChart
            size={120}
            segments={donutPorComponente}
            centerLabel={formatInt(totalPropuestas)}
            centerSubLabel="TOTAL"
          />
          <ul className="flex-1 space-y-1.5">
            {donutPorComponente.map((s) => {
              const code = s.label.replace(/\s+/g, "").replace("Componente", "C");
              return (
                <li key={s.label}>
                  <Link
                    href={`/intervenciones?componente=${code}`}
                    className="flex items-center justify-between rounded-md px-1.5 py-0.5 text-[11px] transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn("h-2.5 w-2.5 rounded-sm", {
                          "bg-primary": s.color === "primary",
                          "bg-secondary": s.color === "secondary",
                          "bg-tertiary": s.color === "tertiary",
                        })}
                      />
                      <span className="text-on-surface-variant">{s.label}</span>
                    </div>
                    <span className="font-bold text-on-surface">
                      {Math.round((s.value / totalPropuestas) * 100)}%{" "}
                      <span className="font-normal text-on-surface-variant">({formatInt(s.value)})</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>

      {/* SECCIÓN 4 — Tendencia por componente */}
      <Card className="p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-title-md font-bold text-on-surface">Tendencia por componente</h3>
          <span className="flex items-center gap-1 text-[11px] font-bold text-success">
            <TrendingUp className="size-3" />
            Acumulado
          </span>
        </div>
        <LineChart series={lineSeries} height={170} />
        <p className="mt-1 text-[10px] text-on-surface-variant">
          Acumulado trimestral de propuestas por componente.
        </p>
      </Card>
    </aside>
  );
}
