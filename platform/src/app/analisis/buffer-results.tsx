// =============================================================================
// Resultados del buffer (Server): tabla ordenable visualmente + descarga CSV.
// Sin estado de cliente (es server-rendered a partir de props).
// =============================================================================

import { Card } from "@/components/ui/card";
import type {
  BufferResultItem,
  BufferTarget,
  QuebradaFull,
  PropuestaSimple,
} from "@/lib/types";
import { RESULT_LABEL } from "./_types";

function fmtDist(m: number | null): string {
  if (m == null) return "—";
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${m.toFixed(1)} m`;
}

function targetLabel(
  tipo: BufferTarget,
  id: number,
  quebradas: QuebradaFull[],
  propuestas: PropuestaSimple[],
): string {
  if (tipo === "quebrada") {
    const q = quebradas.find((x) => x.idQuebrada === id);
    return q ? `Quebrada #${q.idQuebrada} — ${q.nombreQuebrada}` : `Quebrada #${id}`;
  }
  const p = propuestas.find((x) => x.idPropuesta === id);
  return p ? `Propuesta #${p.idPropuesta} (${p.tipo}) — ${p.actividad || "—"}` : `Propuesta #${id}`;
}

export function BufferResults({
  items,
  targetTipo,
  targetId,
  distanciaM,
  quebradas,
  propuestas,
}: {
  items: BufferResultItem[];
  targetTipo: BufferTarget;
  targetId: number;
  distanciaM: number;
  quebradas: QuebradaFull[];
  propuestas: PropuestaSimple[];
}) {
  const targetStr = targetLabel(targetTipo, targetId, quebradas, propuestas);
  const totalArea = items.reduce((acc, it) => acc + (it.areaHa ?? 0), 0);

  return (
    <div className="mt-6 rounded-lg border border-outline-variant bg-surface-container-lowest">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low p-3 text-body-sm">
        <div>
          <p className="text-label-lg uppercase tracking-wider text-on-surface-variant">Resultado</p>
          <p className="font-bold text-on-surface">{targetStr}</p>
          <p className="text-on-surface-variant">
            Radio <span className="font-bold text-primary">{fmtDist(distanciaM)}</span>
            {" · "}
            <span className="font-bold">{items.length}</span> entidades dentro
            {totalArea > 0 && (
              <> · <span className="font-bold">{totalArea.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ha</span> totales</>
            )}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low text-[11px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold text-right">Distancia</th>
              <th className="px-4 py-3 font-semibold text-right">Área</th>
              <th className="px-4 py-3 font-semibold text-right">Centroide (lat, lon)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                  Sin entidades dentro del radio.
                </td>
              </tr>
            )}
            {items.map((it, i) => (
              <tr key={`${it.tipo}-${it.id}-${i}`} className="hover:bg-surface-container-low/40">
                <td className="px-4 py-3 text-on-surface-variant">{RESULT_LABEL[it.tipo]}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-on-surface-variant">
                  #{it.id}
                </td>
                <td className="px-4 py-3 font-bold text-on-surface">{it.nombre}</td>
                <td className="px-4 py-3 text-right font-mono text-[12px] text-primary">
                  {fmtDist(it.distanciaM)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[12px] text-on-surface">
                  {it.areaHa != null ? it.areaHa.toLocaleString("es-CO", { maximumFractionDigits: 2 }) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[11px] text-on-surface-variant">
                  {it.centroidLat != null && it.centroidLon != null
                    ? `${it.centroidLat.toFixed(4)}, ${it.centroidLon.toFixed(4)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="px-3 py-2 text-right text-[11px] text-on-surface-variant">
        PostGIS ST_DWithin sobre geography. SRID origen respetado (4686 / 4326).
      </p>
    </div>
  );
}
