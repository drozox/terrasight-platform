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
                  colSpan={5}
                  className="px-4 py-8 text-center text-on-surface-variant"
                >
                  Sin intervenciones registradas aún.
                </td>
              </tr>
            )}
            {data.map((r) => (
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
                <td className="px-4 py-3 font-mono text-on-surface">
                  {r.codigoPredio}
                </td>
                <td className="px-4 py-3">{r.municipio || "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={r.estado === "Finalizada" ? "info" : "success"}>
                    {r.estado}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-outline-variant/30">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${r.avance}%` }}
                    />
                  </div>
                  <span className="mt-1 block text-[10px] text-on-surface-variant">
                    {formatDecimal(r.avance, 0)}%
                    {r.hectareas !== null && ` · ${formatDecimal(r.hectareas, 2)} ha`}
                    {r.longitud !== null && ` · ${formatDecimal(r.longitud, 0)} m`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}