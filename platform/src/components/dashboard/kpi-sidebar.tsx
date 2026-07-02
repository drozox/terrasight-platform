import { Card } from "@/components/ui/card";
import { IconArrowUp, IconWarn } from "@/components/icons";
import { RefreshCw, Building2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatInt } from "@/lib/utils";
import type { DashboardKpis, ComponenteTotal, FooterKpis, Alerta } from "@/lib/types";
import { DonutChart } from "./donut-chart";

export function KpiSidebar({
  kpis,
  componentes,
  alertas,
  footer,
}: {
  kpis: DashboardKpis;
  componentes: ComponenteTotal[];
  alertas: Alerta[];
  footer: FooterKpis;
}) {
  const totalPropuestas = componentes.reduce((a, c) => a + c.total, 0) || 1;

  const donutPorComponente = [
    { label: "Componente 1", value: componentes.find((c) => c.nombre === "C1")?.total ?? 0, color: "primary" },
    { label: "Componente 2", value: componentes.find((c) => c.nombre === "C2")?.total ?? 0, color: "secondary" },
    { label: "Componente 3", value: componentes.find((c) => c.nombre === "C3")?.total ?? 0, color: "tertiary" },
  ];

  return (
    <aside
      className="
        flex h-full w-80 flex-shrink-0 flex-col gap-gutter overflow-y-auto
        border-l border-outline-variant bg-surface p-gutter
      "
    >
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-label-lg font-bold uppercase tracking-wider text-on-surface-variant">
            Indicadores Generales
          </h3>
          <button
            type="button"
            aria-label="Refrescar"
            title="Refrescar indicadores"
            className="flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
          >
            <RefreshCw className="size-4 transition-transform hover:rotate-180" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <Card className="group cursor-pointer p-4 transition-all hover:border-primary hover:shadow-md">
            <div className="mb-2 flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
                <Building2 className="size-5" />
              </div>
              <span className="flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-primary">
                <IconArrowUp className="size-3" />
                {footer.predios}
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant">Predios Concertados</p>
            <h4 className="mt-1 text-3xl font-bold text-on-surface transition-colors group-hover:text-primary">
              {formatInt(kpis.predios)}
            </h4>
          </Card>

          <Card className="group cursor-pointer p-4 transition-all hover:border-secondary hover:shadow-md">
            <div className="mb-2 flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10 text-secondary transition-colors group-hover:bg-secondary group-hover:text-on-secondary">
                <CheckCircle2 className="size-5" />
              </div>
              <span className="flex items-center gap-1 rounded-full bg-secondary/5 px-2 py-0.5 text-[10px] font-bold text-secondary">
                <IconArrowUp className="size-3" />
                {kpis.propuestas}
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant">Intervenciones Realizadas</p>
            <h4 className="mt-1 text-3xl font-bold text-on-surface transition-colors group-hover:text-secondary">
              {formatInt(kpis.propuestas)}
            </h4>
          </Card>
        </div>
      </div>

      <Card className="p-4">
        <h3 className="mb-4 text-label-lg font-bold uppercase text-on-surface-variant">
          Intervenciones por Componente
        </h3>
        <div className="flex w-full items-center justify-center">
          <DonutChart
            size={144}
            segments={donutPorComponente}
            centerLabel={formatInt(totalPropuestas)}
            centerSubLabel="TOTAL"
          />
        </div>
        <div className="mt-4 space-y-2">
          {donutPorComponente.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between text-body-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn("h-3 w-3 rounded-sm", {
                    "bg-primary": s.color === "primary",
                    "bg-secondary": s.color === "secondary",
                    "bg-tertiary": s.color === "tertiary",
                  })}
                />
                <span>{s.label}</span>
              </div>
              <span className="font-bold">
                {Math.round((s.value / totalPropuestas) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-error/20 bg-error/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-label-lg font-bold uppercase text-error">
            Alertas Activas
          </h3>
          <IconWarn className="size-5 text-error" />
        </div>
        <div className="space-y-3">
          {alertas.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">
              Sin alertas activas
            </p>
          ) : (
            alertas.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "rounded-lg border-l-4 bg-surface-container-lowest p-3 transition-colors hover:bg-surface-variant/30",
                  a.tipo === "error"   && "border-error",
                  a.tipo === "warning" && "border-warning",
                  a.tipo === "info"    && "border-info",
                )}
              >
                <div className="mb-1 flex justify-between text-[10px] font-bold text-on-surface-variant">
                  <span>{a.titulo}</span>
                  <span>{a.fecha}</span>
                </div>
                <p className="text-body-sm leading-tight text-on-surface">
                  {a.descripcion}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </aside>
  );
}
