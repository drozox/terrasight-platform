"use client";

// =============================================================================
// PuntosTable — tabla cliente con expansión a ficha (PuntoDetalle).
//
// Mismo patrón visual que `quebrada-table.tsx`:
//   - Click en fila → expande la ficha (busy/flash/acciones dentro de la ficha).
//   - Badge de tipo con color por `TIPO_PUNTO_COLOR`.
//   - Predio y municipio como links suaves.
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Inbox } from "lucide-react";
import { TIPO_PUNTO_LABEL, TIPO_PUNTO_COLOR } from "@/lib/constants";
import type { MonitoreoPunto } from "@/lib/types";
import { PuntoDetalle } from "./punto-detalle";

export function PuntosTable({
  puntos,
  canEdit,
}: {
  puntos: MonitoreoPunto[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [expandId, setExpandId] = React.useState<number | null>(null);

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low text-[11px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Actividad / Nombre</th>
              <th className="px-4 py-3 font-semibold">Predio</th>
              <th className="px-4 py-3 font-semibold">Municipio</th>
              <th className="px-4 py-3 font-semibold">Componente</th>
              <th className="px-4 py-3 text-right font-semibold">Beneficiarios</th>
              <th className="px-4 py-3 font-semibold">Quebrada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {puntos.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-on-surface-variant">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox className="size-8 opacity-40" />
                    <p>Sin puntos de monitoreo.</p>
                  </div>
                </td>
              </tr>
            )}
            {puntos.map((p) => {
              const isExpanded = expandId === p.idPropPunto;
              return (
                <React.Fragment key={p.idPropPunto}>
                  <tr
                    onClick={() => setExpandId(isExpanded ? null : p.idPropPunto)}
                    className={
                      "cursor-pointer transition-colors hover:bg-surface-container-low/60 " +
                      (isExpanded ? "bg-surface-container-low" : "")
                    }
                  >
                    <td className="px-4 py-3 font-mono text-[12px] text-on-surface-variant">
                      #{p.idPropPunto}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={TIPO_PUNTO_COLOR[p.tipoPunto]}>
                        {TIPO_PUNTO_LABEL[p.tipoPunto]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-bold text-on-surface">
                      {p.actividad}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/predios/${p.idPredio}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Building2 className="size-3.5" />
                        <span className="font-mono text-[12px]">{p.codigoPredio}</span>
                      </a>
                      <span className="ml-2 text-[11px] text-on-surface-variant">
                        {p.nombrePredio}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {p.nombreMunicipio ?? <span className="opacity-50">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-on-surface">
                        {p.nombreComponente}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[12px]">
                      {p.totalBeneficiarios}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {p.nombreQuebrada ? (
                        <a
                          href={p.idQuebrada ? `/quebradas/${p.idQuebrada}` : "#"}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-secondary hover:underline"
                        >
                          <MapPin className="size-3.5" />
                          {p.nombreQuebrada}
                        </a>
                      ) : (
                        <span className="opacity-50">—</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-surface-container-low/60">
                      <td colSpan={8} className="px-4 py-3">
                        <PuntoDetalle
                          punto={p}
                          canEdit={canEdit}
                          onClose={() => {
                            setExpandId(null);
                            router.refresh();
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
