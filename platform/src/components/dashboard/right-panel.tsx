"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DonutChart } from "./donut-chart";
import { LineChart, type LineSeries } from "./line-chart";
import { formatInt, formatHa, cn } from "@/lib/utils";
import {
  TrendingUp,
  Building2,
  Droplets,
  Activity,
  Map as MapIcon,
} from "lucide-react";
import type {
  DashboardKpis,
  ComponenteTotal,
  FooterKpis,
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
 *
 * Nota (DEEPSEEK-66): la sección "Alertas y notificaciones" se quitó — el módulo
 * /alertas está fuera de alcance (ver docs/ALCANCE.md).
 */
export function RightPanel({
  kpis,
  componentes,
  footer,
  seriesComponentes,
}: {
  kpis: DashboardKpis;
  componentes: ComponenteTotal[];
  footer: FooterKpis;
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

  // Indicadores principales (4 tarjetas 2x2) — drill-through a su vista (DEEPSEEK-72)
  const indicadores = [
    {
      label: "Predios",
      valor: formatInt(kpis.predios),
      icon: Building2,
      tint: "primary" as const,
      delta: `${formatInt(footer.predios)} totales`,
      href: "/predios",
    },
    {
      label: "Intervenciones",
      valor: formatInt(kpis.propuestas),
      icon: Activity,
      tint: "secondary" as const,
      delta: `${formatInt(kpis.propuestasEjecucion)} en ejecución`,
      href: "/intervenciones",
    },
    {
      label: "Hectáreas",
      valor: formatHa(footer.hectareasIntervenidas),
      icon: MapIcon,
      tint: "tertiary" as const,
      delta: `${formatHa(kpis.hectareasPredios)} registradas`,
      href: "/predios",
    },
    {
      label: "Metas",
      valor: `${componentes.length} cmp.`,
      icon: Droplets,
      tint: "primary" as const,
      delta: `${formatInt(footer.veredas)} veredas`,
      href: "/metas/convenio",
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
              <Link
                key={ind.label}
                href={ind.href}
                aria-label={`Ver ${ind.label}`}
                className="block rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
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
              </Link>
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
              <li key={s.label}>
                <Link
                  href={`/intervenciones?componente=${s.label.replace(/\s+/g, "")}`}
                  className="flex items-center justify-between rounded-md px-1.5 py-0.5 text-[11px] transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                </Link>
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
    </aside>
  );
}
