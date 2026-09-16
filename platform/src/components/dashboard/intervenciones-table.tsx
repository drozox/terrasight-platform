"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDecimal } from "@/lib/utils";
import type { IntervencionReciente } from "@/lib/types";
import { IconLeaf, IconDrop } from "@/components/icons";
import { ArrowRight } from "lucide-react";
import { codigoAccionPara, type AccionCode } from "@/lib/acciones";
import { cn } from "@/lib/utils";

// Color por componente (mismas reglas que component-ribbon.tsx).
const COMPONENT_COLOR: Record<"C1" | "C2" | "C3", "primary" | "secondary" | "tertiary"> = {
  C1: "primary",
  C2: "secondary",
  C3: "tertiary",
};

/** Resuelve el código visible (C1A1..C3AU) aunque venga de demo data sin el campo. */
function codigoVisible(r: IntervencionReciente): AccionCode | null {
  if (r.componenteAccion) return r.componenteAccion as AccionCode;
  return codigoAccionPara(r.componente, r.accion);
}

export function IntervencionesTable({
  rows,
  title = "Monitoreo de Intervenciones",
  limit,
}: {
  rows: IntervencionReciente[];
  title?: string;
  limit?: number;
}) {
  const router = useRouter();
  const data = limit ? rows.slice(0, limit) : rows;

  return (
    <Card className="overflow-hidden xl:col-span-6">
      <div className="flex items-center justify-between border-b border-outline-variant p-4">
        <h3 className="text-title-lg font-semibold text-on-surface">{title}</h3>
        <Link
          href="/intervenciones"
          className="group flex items-center gap-1 text-label-lg font-bold text-primary transition-colors hover:text-primary/80"
        >
          Ver todas
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-container-low text-[11px] font-bold uppercase text-on-surface-variant">
              <th className="px-4 py-3">Intervención</th>
              <th className="px-4 py-3">Componente</th>
              <th className="px-4 py-3">Predio</th>
              <th className="px-4 py-3">Municipio</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Avance</th>
            </tr>
          </thead>
          <tbody className="text-body-sm">
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-on-surface-variant"
                >
                  Sin intervenciones registradas aún.
                </td>
              </tr>
            )}
            {data.map((r) => {
              const codigo = codigoVisible(r);
              const compClave = (["C1", "C2", "C3"] as const).find((c) => c === r.componente);
              return (
              <tr
                key={r.id}
                onClick={() => router.push(`/intervenciones/${r.id}`)}
                className="cursor-pointer border-b border-outline-variant/30 transition-colors hover:bg-surface-container-low"
              >
                <td className="flex items-center gap-2 px-4 py-3">
                  {r.tipo === "punto" ? (
                    <IconDrop className="size-4 text-secondary" />
                  ) : (
                    <IconLeaf className="size-4 text-primary" />
                  )}
                  <span className="capitalize">{r.actividad || r.tipo}</span>
                </td>
                <td className="px-4 py-3">
                  {codigo && compClave ? (
                    <Badge variant={COMPONENT_COLOR[compClave]}>{codigo}</Badge>
                  ) : (
                    <span className="font-mono text-[12px] text-on-surface-variant">
                      {r.componente}{r.accion}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-on-surface">
                  {r.codigoPredio}
                </td>
                <td className="px-4 py-3">{r.municipio || "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={r.estado === "FINALIZADA" ? "info" : "success"}>
                    {r.estado}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {r.avance === null || r.avance === undefined ? (
                    <span
                      className="inline-flex items-center rounded-full border border-dashed border-outline-variant px-2 py-0.5 text-[10px] font-mono text-on-surface-variant"
                      title="Esta propuesta no tiene un evento de avance registrado por un gestor."
                    >
                      Avance no registrado
                    </span>
                  ) : (
                    <>
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-outline-variant/30"
                        role="progressbar"
                        aria-valuenow={r.avance}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className={`h-full rounded-full transition-all ${
                            r.avance >= 80
                              ? "bg-success"
                              : r.avance >= 50
                                ? "bg-primary"
                                : "bg-warning"
                          }`}
                          style={{ width: `${r.avance}%` }}
                        />
                      </div>
                      <span className="mt-1 block text-[10px] text-on-surface-variant">
                        {formatDecimal(r.avance, 0)}%
                        {r.hectareas !== null && ` · ${formatDecimal(r.hectareas, 2)} ha`}
                        {r.longitud !== null && ` · ${formatDecimal(r.longitud, 0)} m`}
                      </span>
                    </>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}