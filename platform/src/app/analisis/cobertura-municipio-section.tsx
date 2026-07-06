// =============================================================================
// Cobertura CLC × municipio (HU-AA-03) — Server Component.
// Muestra desglose de cobertura vegetal por municipio con porcentaje.
// =============================================================================

import { Card } from "@/components/ui/card";
import { formatDecimal, formatInt } from "@/lib/utils";
import type { CoberturaMunicipioFila } from "@/lib/repository";

const COLOR_BY_NAME: Record<string, string> = {
  "Bosque Natural":      "bg-primary/15 text-primary",
  "Vegetación Sec.":     "bg-secondary/15 text-secondary",
  "Vegetacion Secundaria":"bg-secondary/15 text-secondary",
  "Agropecuario":        "bg-tertiary/15 text-tertiary",
  "Otros":               "bg-outline-variant/30 text-on-surface-variant",
};

function chipStyle(nombre: string): string {
  return COLOR_BY_NAME[nombre] ?? "bg-surface-container-highest text-on-surface";
}

export function CoberturaPorMunicipio({ filas }: { filas: CoberturaMunicipioFila[] }) {
  if (filas.length === 0) {
    return (
      <p className="text-center text-body-sm text-on-surface-variant">
        Sin datos de cobertura por municipio. Verificar que
        <code className="font-mono text-[11px]"> sgs_rel_predio_cobertura </code>
        esté poblada.
      </p>
    );
  }
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-container-low text-[11px] uppercase tracking-wider text-on-surface-variant">
          <tr>
            <th className="px-4 py-3 font-semibold">Municipio</th>
            <th className="px-4 py-3 text-right font-semibold">ha totales</th>
            <th className="px-4 py-3 text-left font-semibold">Desglose CLC</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/40">
          {filas.map((f) => (
            <tr key={f.municipio} className="hover:bg-surface-container-low/40">
              <td className="px-4 py-3 font-bold text-on-surface">{f.municipio}</td>
              <td className="px-4 py-3 text-right font-mono text-[12px] text-on-surface">
                {formatDecimal(f.totalHa, 2)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {f.porCobertura.map((c) => (
                    <span
                      key={c.nombre}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${chipStyle(c.nombre)}`}
                      title={`${formatInt(c.predios)} predios · ${formatDecimal(c.ha, 2)} ha`}
                    >
                      {c.nombre}
                      <span className="font-bold">{c.porcentaje}%</span>
                    </span>
                  ))}
                  {f.porCobertura.length === 0 && (
                    <span className="text-on-surface-variant/50">—</span>
                  )}
                </div>
                {/* Barra de progreso apilada */}
                {f.totalHa > 0 && (
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-variant">
                    {f.porCobertura.map((c, i) => (
                      <span
                        key={c.nombre}
                        className={i === 0 ? "bg-primary" : i === 1 ? "bg-secondary" : "bg-tertiary"}
                        style={{ width: `${c.porcentaje}%` }}
                        title={`${c.nombre}: ${c.porcentaje}%`}
                      />
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
