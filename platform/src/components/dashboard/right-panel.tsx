"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatInt, formatHa, cn } from "@/lib/utils";
import { Building2, Activity, Map as MapIcon, Route } from "lucide-react";
import type { DashboardKpis, FooterKpis } from "@/lib/types";
import type { ResumenComponente } from "@/lib/repos";
import { ESTADO_BAR } from "@/lib/estado-indicador";
import { PanelGate } from "./panel-toggles";
import type { ReactNode } from "react";

/**
 * RightPanel — columna derecha del dashboard, componente-céntrica.
 *  1. Avance del componente (gauge + indicadores)
 *  2. Indicadores del componente (KPIs)
 */
export function RightPanel({
  kpis,
  footer,
  resumen,
  metasSlot,
}: {
  kpis: DashboardKpis;
  footer: FooterKpis;
  resumen?: ResumenComponente;
  metasSlot?: ReactNode;
}) {
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

  return (
    <aside className="flex w-full flex-col gap-5 rounded-[20px] border border-outline-variant bg-surface p-6">
      {/* Ajuste 6: Metas del convenio vive en la columna derecha (slot). */}
      {metasSlot}

      {/* SECCIÓN 1 — Avance del componente */}
      {resumen && (
        <PanelGate id="avance">
        <Card className="p-5">
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
    </aside>
  );
}
