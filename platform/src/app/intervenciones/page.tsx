import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getIntervencionesRecientes, getComponentes } from "@/lib/repos";
import { getCurrentUser } from "@/lib/auth-guard";
import { formatDecimal, formatInt } from "@/lib/utils";
import { EstadoIntervencionDropdown } from "./estado-dropdown";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ componente?: string }>;

const COMPONENT_COLOR: Record<string, "primary" | "secondary" | "tertiary"> = {
  C1: "primary",
  C2: "secondary",
  C3: "tertiary",
};

const COMPONENT_ACTIVE_BG: Record<"primary" | "secondary" | "tertiary", string> = {
  primary:   "border-primary bg-primary text-on-primary",
  secondary: "border-secondary bg-secondary text-on-secondary",
  tertiary:  "border-tertiary bg-tertiary text-on-tertiary",
};

export default async function IntervencionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [params, usuario] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);
  const componente = params.componente ?? null;
  const canEdit = usuario?.rol === "ADMIN" || usuario?.rol === "GESTOR";

  const [intervenciones, componentes] = await Promise.all([
    getIntervencionesRecientes(50, componente),
    getComponentes(),
  ]);

  const totalPorComponente = componentes.reduce<Record<string, number>>(
    (acc, c) => ({ ...acc, [c.nombre]: c.total }),
    {},
  );

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-7xl flex-col gap-gutter">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <Wrench className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">
                Intervenciones
              </h1>
              <p className="text-body-sm text-on-surface-variant">
                {intervenciones.length} propuestas
                {componente ? ` del componente ${componente}` : ""} ·{" "}
                {formatInt(
                  intervenciones.reduce((acc, i) => acc + (i.hectareas ?? 0), 0),
                )}{" "}
                ha totales
              </p>
            </div>
          </div>
        </div>

        {/* Chips de filtro */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/intervenciones"
            className={`rounded-full border px-3 py-1 text-label-lg font-bold transition-colors ${
              !componente
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant"
            }`}
          >
            Todas ({componentes.reduce((a, c) => a + c.total, 0)})
          </Link>
          {componentes.map((c) => {
            const color = COMPONENT_COLOR[c.nombre];
            return (
              <Link
                key={c.nombre}
                href={`/intervenciones?componente=${c.nombre}`}
                className={`rounded-full border px-3 py-1 text-label-lg font-bold transition-colors ${
                  componente === c.nombre
                    ? COMPONENT_ACTIVE_BG[color]
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                {c.nombre} ({totalPorComponente[c.nombre]})
              </Link>
            );
          })}
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-body-sm">
              <thead>
                <tr className="bg-surface-container-low text-[11px] font-bold uppercase text-on-surface-variant">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Actividad</th>
                  <th className="px-4 py-3">Predio</th>
                  <th className="px-4 py-3">Municipio</th>
                  <th className="px-4 py-3">Componente</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Avance</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {intervenciones.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-on-surface-variant">
                      Sin intervenciones registradas.
                    </td>
                  </tr>
                )}
                {intervenciones.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-outline-variant/30 transition-colors hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-3 font-mono text-on-surface-variant">
                      #{i.id}
                    </td>
                    <td className="px-4 py-3 capitalize text-on-surface">
                      {i.actividad || i.tipo}
                    </td>
                    <td className="px-4 py-3 font-mono text-on-surface">
                      {i.codigoPredio}
                    </td>
                    <td className="px-4 py-3">{i.municipio || "—"}</td>
                    <td className="px-4 py-3">
                      {i.componente && COMPONENT_COLOR[i.componente] ? (
                        <Badge variant={COMPONENT_COLOR[i.componente]}>
                          {i.componente}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoIntervencionDropdown
                        idPropuesta={i.id}
                        estado={i.estado}
                        canEdit={canEdit}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {i.avance === null || i.avance === undefined ? (
                        <span
                          className="inline-flex items-center rounded-full border border-dashed border-outline-variant px-2 py-0.5 text-[10px] font-mono text-on-surface-variant"
                          title="Esta propuesta no tiene un evento de avance registrado por un gestor."
                        >
                          Avance no registrado
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <div
                            className="h-1.5 w-20 overflow-hidden rounded-full bg-outline-variant/30"
                            role="progressbar"
                            aria-valuenow={i.avance}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className={`h-full rounded-full ${
                                i.avance >= 80
                                  ? "bg-success"
                                  : i.avance >= 50
                                    ? "bg-primary"
                                    : "bg-warning"
                              }`}
                              style={{ width: `${i.avance}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono">
                            {formatDecimal(i.avance, 0)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/intervenciones/${i.id}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-label-lg font-bold text-primary transition-colors hover:bg-primary/10"
                      >
                        Ver <ArrowRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-center text-[11px] text-on-surface-variant">
          Mostrando las primeras {intervenciones.length} intervenciones.
        </p>
      </div>
    </div>
  );
}