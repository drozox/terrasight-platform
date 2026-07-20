// =============================================================================
// Matriz cruzada componente × municipio (HU-AA-04).
// Server Component: rows vienen de getMatrizComponenteMunicipio().
// =============================================================================

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatInt, formatDecimal } from "@/lib/utils";
import type { MatrizFila } from "@/lib/types";

const C_COLORS = {
  C1: "primary",
  C2: "secondary",
  C3: "tertiary",
} as const;

export function MatrizTable({ rows }: { rows: MatrizFila[] }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-container-low text-[11px] uppercase tracking-wider text-on-surface-variant">
          <tr>
            <th className="px-4 py-3 font-semibold">Municipio</th>
            <th className="px-4 py-3 text-right font-semibold">C1</th>
            <th className="px-4 py-3 text-right font-semibold">C2</th>
            <th className="px-4 py-3 text-right font-semibold">C3</th>
            <th className="px-4 py-3 text-right font-semibold">Total ha</th>
            <th className="px-4 py-3 text-right font-semibold"># Propuestas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/40">
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                Sin datos por municipio. Verificar que las tablas bcs_lpa_* estén pobladas.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.municipio} className="hover:bg-surface-container-low/40">
              <td className="px-4 py-3 font-bold text-on-surface">{r.municipio}</td>
              <Col cel={r.C1} />
              <Col cel={r.C2} />
              <Col cel={r.C3} />
              <td className="px-4 py-3 text-right font-mono text-[12px] text-on-surface">
                {formatDecimal(r.totalHectareas, 2)}
              </td>
              <td className="px-4 py-3 text-right">
                <Badge variant="primary">{formatInt(r.totalNumPropuestas)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Col({ cel }: { cel: { numPropuestas: number; hectareas: number } }) {
  if (cel.numPropuestas === 0 && cel.hectareas === 0) {
    return (
      <td className="px-4 py-3 text-right text-on-surface-variant/60">
        <span className="text-[11px]">—</span>
      </td>
    );
  }
  return (
    <td className="px-4 py-3 text-right">
      <p className="font-mono text-[12px] text-on-surface">{formatDecimal(cel.hectareas, 2)} ha</p>
      <p className="text-[10px] text-on-surface-variant">{formatInt(cel.numPropuestas)} propuesta{cel.numPropuestas === 1 ? "" : "s"}</p>
    </td>
  );
}
