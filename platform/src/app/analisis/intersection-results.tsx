// =============================================================================
// Resultado de intersección por bounding box (HU-AA-03) — Server Component.
// Renderiza el IntersectionResult devuelto por el repo.
// =============================================================================

import { Card } from "@/components/ui/card";
import { formatDecimal, formatInt } from "@/lib/utils";
import type { IntersectionResult } from "@/lib/types";

export function IntersectionResults({
  result,
  error,
}: {
  result: IntersectionResult | null;
  error: string | null;
}) {
  if (error) {
    return (
      <div role="alert" className="mt-4 rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
        {error}
      </div>
    );
  }
  if (!result) return null;

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
        <h3 className="mb-2 text-label-lg font-bold uppercase tracking-wider text-on-surface-variant">
          Resumen del rectángulo
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Predios dentro" value={formatInt(result.numPredios)} />
          <Stat label="Propuestas dentro" value={formatInt(result.numPropuestas)} />
          <Stat label="ha predios" value={formatDecimal(result.totalAreaPrediosHa, 2)} />
          <Stat
            label="ha del rectángulo"
            value={result.areaHaBbox != null ? formatDecimal(result.areaHaBbox, 2) : "—"}
          />
        </div>
        {result.areaHaBbox && result.areaHaBbox > 0 && (
          <p className="mt-3 text-[11px] text-on-surface-variant">
            Densidad: {formatDecimal((result.totalAreaPrediosHa / result.areaHaBbox) * 100, 1)}% del rectángulo está cubierto por predios del convenio.
          </p>
        )}
      </div>

      {/* Predios */}
      <Card className="overflow-x-auto">
        <div className="border-b border-outline-variant bg-surface-container-low p-3 text-label-lg font-bold uppercase tracking-wider text-on-surface-variant">
          Predios ({result.predios.length})
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-4 py-2 font-semibold">ID</th>
              <th className="px-4 py-2 font-semibold">Nombre</th>
              <th className="px-4 py-2 font-semibold text-right">Área (ha)</th>
              <th className="px-4 py-2 font-semibold">Componente</th>
              <th className="px-4 py-2 font-semibold text-right">Centroide</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {result.predios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-on-surface-variant">
                  Sin predios dentro del rectángulo.
                </td>
              </tr>
            )}
            {result.predios.map((p) => (
              <tr key={p.idPredio} className="hover:bg-surface-container-low/40">
                <td className="px-4 py-2 font-mono text-[12px] text-on-surface-variant">#{p.idPredio}</td>
                <td className="px-4 py-2 font-bold text-on-surface">{p.nombre}</td>
                <td className="px-4 py-2 text-right font-mono text-[12px] text-on-surface">
                  {formatDecimal(p.areaHaBdr, 2)}
                </td>
                <td className="px-4 py-2 text-[11px] text-on-surface-variant">
                  {p.componente ?? <span className="text-on-surface-variant/50">—</span>}
                </td>
                <td className="px-4 py-2 text-right font-mono text-[11px] text-on-surface-variant">
                  {p.centroideLat.toFixed(4)}, {p.centroideLon.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Propuestas */}
      <Card className="overflow-x-auto">
        <div className="border-b border-outline-variant bg-surface-container-low p-3 text-label-lg font-bold uppercase tracking-wider text-on-surface-variant">
          Propuestas ({result.propuestas.length})
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-4 py-2 font-semibold">ID</th>
              <th className="px-4 py-2 font-semibold">Tipo</th>
              <th className="px-4 py-2 font-semibold">Actividad</th>
              <th className="px-4 py-2 font-semibold">Estado</th>
              <th className="px-4 py-2 font-semibold text-right">ha</th>
              <th className="px-4 py-2 font-semibold text-right">Long (m)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {result.propuestas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-on-surface-variant">
                  Sin propuestas dentro del rectángulo.
                </td>
              </tr>
            )}
            {result.propuestas.map((p) => (
              <tr key={p.idPropuesta} className="hover:bg-surface-container-low/40">
                <td className="px-4 py-2 font-mono text-[12px] text-on-surface-variant">#{p.idPropuesta}</td>
                <td className="px-4 py-2 text-on-surface-variant">{p.tipo}</td>
                <td className="px-4 py-2 font-bold text-on-surface">{p.actividad || "(sin descripción)"}</td>
                <td className="px-4 py-2 text-[11px] text-on-surface-variant">{p.estado}</td>
                <td className="px-4 py-2 text-right font-mono text-[12px] text-on-surface">
                  {p.hectareas != null ? formatDecimal(p.hectareas, 2) : "—"}
                </td>
                <td className="px-4 py-2 text-right font-mono text-[12px] text-on-surface">
                  {p.longitudM != null ? formatInt(p.longitudM) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-right text-[11px] text-on-surface-variant">
        PostGIS ST_Intersects + ST_MakeEnvelope(4326). Resultados limitados a
        500 entidades por tabla.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="font-mono text-lg font-bold text-on-surface">{value}</p>
    </div>
  );
}
