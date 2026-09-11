"use client";

import { Card } from "@/components/ui/card";
import { DonutChart } from "./donut-chart";
import { LineChart, type LineSeries } from "./line-chart";
import { formatInt, formatHa, cn } from "@/lib/utils";
import {
  TrendingUp,
  AlertTriangle,
  Info,
  Clock,
  Building2,
  Droplets,
  Activity,
  Map as MapIcon,
} from "lucide-react";
import type {
  DashboardKpis,
  ComponenteTotal,
  FooterKpis,
  Alerta,
  SerieTemporal,
} from "@/lib/types";

/**
 * RightPanel — columna derecha del dashboard.
 * Inspirado en `right-panel.tsx` del dashboard de referencia (geoportal-data-dashboard),
 * adaptado al theme SIG TERRITORIO (primary/secondary/tertiary) y usando datos reales de BD.
 *
 * Secciones:
 *  1. Indicadores Generales (grid 2x2)
 *  2. Intervenciones por Componente (donut + lista)
 *  3. Tendencia de Propuestas (line chart multi-serie)
 *  4. Alertas y Notificaciones (lista con niveles)
 */
export function RightPanel({
  kpis,
  componentes,
  footer,
  alertas,
  seriesComponentes,
}: {
  kpis: DashboardKpis;
  componentes: ComponenteTotal[];
  footer: FooterKpis;
  alertas: Alerta[];
  seriesComponentes?: Record<"C1" | "C2" | "C3", SerieTemporal[]>;
}) {
  const totalPropuestas =
    componentes.reduce((acc, c) => acc + c.total, 0) || 1;

  const donutPorComponente = [
    {
      label: "Componente 1",
      value: componentes.find((c) => c.nombre === "C1")?.total ?? 0,
      color: "primary" as const,
    },
    {
      label: "Componente 2",
      value: componentes.find((c) => c.nombre === "C2")?.total ?? 0,
      color: "secondary" as const,
    },
    {
      label: "Componente 3",
      value: componentes.find((c) => c.nombre === "C3")?.total ?? 0,
      color: "tertiary" as const,
    },
  ];

  // Indicadores principales (4 tarjetas 2x2)
  const indicadores = [
    {
      label: "Predios",
      valor: formatInt(kpis.predios),
      icon: Building2,
      tint: "primary" as const,
      delta: `${formatInt(footer.predios)} totales`,
    },
    {
      label: "Intervenciones",
      valor: formatInt(kpis.propuestas),
      icon: Activity,
      tint: "secondary" as const,
      delta: `${formatInt(kpis.propuestasEjecucion)} en ejecución`,
    },
    {
      label: "Hectáreas",
      valor: formatHa(footer.hectareasIntervenidas),
      icon: MapIcon,
      tint: "tertiary" as const,
      delta: `${formatHa(kpis.hectareasPredios)} registradas`,
    },
    {
      label: "Quebradas",
      valor: formatInt(footer.quebradas),
      icon: Droplets,
      tint: "primary" as const,
      delta: `${formatInt(footer.veredas)} veredas`,
    },
  ];

  const tintBg: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    tertiary: "bg-tertiary/10 text-tertiary",
  };

  // Series para LineChart — si no hay datos del repository, fallback vacío
  const lineSeries: LineSeries[] = seriesComponentes
    ? [
        {
          label: "C1",
          color: "primary",
          data: seriesComponentes.C1,
        },
        {
          label: "C2",
          color: "secondary",
          data: seriesComponentes.C2,
        },
        {
          label: "C3",
          color: "tertiary",
          data: seriesComponentes.C3,
        },
      ]
    : [];

  return (
    <aside
      className="
        flex h-full w-[360px] flex-shrink-0 flex-col gap-3 overflow-y-auto
        border-l border-outline-variant bg-surface p-3
      "
    >
      {/* SECCIÓN 1 — Indicadores Generales (grid 2x2) */}
      <Card className="p-3">
        <div className="mb-2.5 flex items-center justify-between">
          {/* UX-39 (audit 2026-07-24): era uppercase tracking-wider. Es un
             HEADER de sección, no un LABEL de metadata. Sentence case +
             text-title-md (más prominente). Los LABELs (chips, badges
             internos) sí mantienen uppercase. */}
          <h3 className="text-title-md font-bold text-on-surface">
            Indicadores generales
          </h3>
          <button
            type="button"
            aria-label="Ver reporte"
            className="text-[11px] font-bold text-primary hover:underline"
          >
            Ver reporte
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {indicadores.map((ind) => {
            const Icon = ind.icon;
            return (
              <div
                key={ind.label}
                className="rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 transition-colors hover:border-primary/50"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md",
                      tintBg[ind.tint],
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="text-[10px] font-bold uppercase leading-tight text-on-surface-variant">
                    {ind.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold leading-none text-on-surface">
                    {ind.valor}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-tight text-on-surface-variant">
                  {ind.delta}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* SECCIÓN 2 — Intervenciones por Componente */}
      <Card className="p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-title-md font-bold text-on-surface">
            Intervenciones por componente
          </h3>
          <button
            type="button"
            className="text-[11px] font-bold text-primary hover:underline"
          >
            Ver detalle
          </button>
        </div>
        <div className="flex items-center gap-3">
          <DonutChart
            size={120}
            segments={donutPorComponente}
            centerLabel={formatInt(totalPropuestas)}
            centerSubLabel="TOTAL"
          />
          <ul className="flex-1 space-y-1.5">
            {donutPorComponente.map((s) => (
              <li
                key={s.label}
                className="flex items-center justify-between text-[11px]"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn("h-2.5 w-2.5 rounded-sm", {
                      "bg-primary":   s.color === "primary",
                      "bg-secondary": s.color === "secondary",
                      "bg-tertiary":  s.color === "tertiary",
                    })}
                  />
                  <span className="text-on-surface-variant">{s.label}</span>
                </div>
                <span className="font-bold text-on-surface">
                  {Math.round((s.value / totalPropuestas) * 100)}%{" "}
                  <span className="text-on-surface-variant font-normal">
                    ({formatInt(s.value)})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* SECCIÓN 3 — Tendencia de Propuestas */}
      <Card className="p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-title-md font-bold text-on-surface">
            Tendencia por componente
          </h3>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] font-bold text-success hover:underline"
          >
            <TrendingUp className="size-3" />
            Ver tendencia
          </button>
        </div>
        <LineChart series={lineSeries} height={170} />
        <p className="mt-1 text-[10px] text-on-surface-variant">
          Acumulado trimestral de propuestas por componente.
        </p>
      </Card>

      {/* SECCIÓN 4 — Alertas y Notificaciones */}
      <Card className="p-3">
        <div className="mb-2.5 flex items-center justify-between">
          {/* En esta card el color error sí tiene sentido porque es un panel
             de alertas activas — el header lleva el tono para reforzar
             urgencia visual. */}
          <h3 className="text-title-md font-bold text-error">
            Alertas y notificaciones
          </h3>
          <AlertTriangle className="size-4 text-error" />
        </div>
        <ul className="space-y-2">
          {alertas.length === 0 && (
            <p className="py-4 text-center text-body-sm text-on-surface-variant">
              Sin alertas activas
            </p>
          )}
          {alertas.map((a) => {
            const Icon =
              a.tipo === "error"   ? AlertTriangle :
              a.tipo === "warning" ? Clock        :
                                     Info;
            const iconColor =
              a.tipo === "error"   ? "text-error"   :
              a.tipo === "warning" ? "text-warning" :
                                     "text-info";
            return (
              <li
                key={a.id}
                className={cn(
                  "rounded-lg border-l-4 bg-surface-container-low p-2.5 transition-colors hover:bg-surface-variant/40",
                  a.tipo === "error"   && "border-error",
                  a.tipo === "warning" && "border-warning",
                  a.tipo === "info"    && "border-info",
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon className={cn("mt-0.5 size-3.5 shrink-0", iconColor)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold leading-tight text-on-surface">
                        {a.titulo}
                      </p>
                      <span className="shrink-0 text-[9px] text-on-surface-variant">
                        {a.fecha}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-on-surface-variant">
                      {a.descripcion}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </aside>
  );
}