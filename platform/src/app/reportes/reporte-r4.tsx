"use client";

// =============================================================================
// ReporteR4Viewer — R4 "Propuestas por predio".
//
// Lista TODOS los predios; cada uno tiene "Ver intervenciones" que abre una
// subpestaña con las intervenciones del predio (tipo, actividad, estado,
// medida) consultadas on-demand a /api/reportes/r4.
// =============================================================================

import * as React from "react";
import { ArrowLeft, Loader2, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReporteR4Fila, ReporteR4Intervencion } from "@/lib/types";

function etiquetaEstado(estado: string): string {
  if (!estado) return "—";
  const s = estado.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ReporteR4Viewer({ filas }: { filas: ReporteR4Fila[] }) {
  const [selected, setSelected] = React.useState<ReporteR4Fila | null>(null);
  const [intervenciones, setIntervenciones] = React.useState<ReporteR4Intervencion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function verIntervenciones(predio: ReporteR4Fila) {
    setSelected(predio);
    setLoading(true);
    setError(null);
    setIntervenciones([]);
    try {
      const r = await fetch(`/api/reportes/r4?predio=${predio.idPredio}`);
      const data = (await r.json()) as {
        ok?: boolean;
        intervenciones?: ReporteR4Intervencion[];
        error?: string;
      };
      if (!r.ok || !data.ok) {
        setError(data.error ?? `Error ${r.status}`);
        return;
      }
      setIntervenciones(data.intervenciones ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (filas.length === 0) {
    return (
      <p className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-6 text-center text-body-sm text-on-surface-variant">
        Sin predios para los filtros seleccionados.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subpestaña: intervenciones del predio seleccionado */}
      {selected && (
        <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelected(null)}
              >
                <ArrowLeft className="size-4" />
                Volver
              </Button>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-on-surface-variant">
                  Intervenciones del predio
                </p>
                <h3 className="text-title-md font-bold text-on-surface">
                  {selected.codigo} — {selected.nombrePredio}
                </h3>
              </div>
            </div>
            <span className="text-[11px] text-on-surface-variant">
              {selected.propietario || "—"}
            </span>
          </header>

          {loading ? (
            <p className="flex items-center gap-2 text-body-sm text-on-surface-variant">
              <Loader2 className="size-4 animate-spin" /> Cargando intervenciones…
            </p>
          ) : error ? (
            <p className="text-body-sm text-error">{error}</p>
          ) : intervenciones.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">
              Este predio no tiene intervenciones registradas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-body-sm">
                <thead>
                  <tr className="bg-surface-container-lowest text-[11px] uppercase tracking-wider text-on-surface-variant">
                    <th className="border border-outline-variant px-3 py-2 font-semibold">Tipo</th>
                    <th className="border border-outline-variant px-3 py-2 font-semibold">Actividad</th>
                    <th className="border border-outline-variant px-3 py-2 font-semibold">Componente / Acción</th>
                    <th className="border border-outline-variant px-3 py-2 font-semibold">Estado</th>
                    <th className="border border-outline-variant px-3 py-2 font-semibold text-right">Medida</th>
                  </tr>
                </thead>
                <tbody>
                  {intervenciones.map((it) => (
                    <tr key={it.idPropuesta} className="border-b border-outline-variant/40">
                      <td className="border border-outline-variant/30 px-3 py-2 capitalize">{it.tipo}</td>
                      <td className="border border-outline-variant/30 px-3 py-2">{it.actividad}</td>
                      <td className="border border-outline-variant/30 px-3 py-2">
                        {it.componente ? `${it.componente}${it.accion}` : "—"}
                      </td>
                      <td className="border border-outline-variant/30 px-3 py-2">{etiquetaEstado(it.estado)}</td>
                      <td className="border border-outline-variant/30 px-3 py-2 text-right font-mono text-[12px]">
                        {it.medida}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Tabla principal: todos los predios */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-body-sm">
          <thead>
            <tr className="bg-surface-container-low text-[11px] uppercase tracking-wider text-on-surface-variant print:bg-gray-100">
              <th className="border border-outline-variant px-3 py-2 font-semibold">Código</th>
              <th className="border border-outline-variant px-3 py-2 font-semibold">Nombre</th>
              <th className="border border-outline-variant px-3 py-2 font-semibold">Propietario</th>
              <th className="border border-outline-variant px-3 py-2 font-semibold">Municipio</th>
              <th className="border border-outline-variant px-3 py-2 font-semibold">Vereda</th>
              <th className="border border-outline-variant px-3 py-2 font-semibold">Núcleo predial</th>
              <th className="border border-outline-variant px-3 py-2 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((p) => (
              <tr
                key={p.idPredio}
                className={`border-b border-outline-variant/40 ${
                  selected?.idPredio === p.idPredio ? "bg-primary/5" : ""
                }`}
              >
                <td className="border border-outline-variant/30 px-3 py-2 font-mono text-[12px]">{p.codigo}</td>
                <td className="border border-outline-variant/30 px-3 py-2 font-bold text-on-surface">{p.nombrePredio}</td>
                <td className="border border-outline-variant/30 px-3 py-2">{p.propietario || "—"}</td>
                <td className="border border-outline-variant/30 px-3 py-2">{p.nombreMunicipio || "—"}</td>
                <td className="border border-outline-variant/30 px-3 py-2">{p.nombreVereda || "—"}</td>
                <td className="border border-outline-variant/30 px-3 py-2">{p.nucleoPredial || "—"}</td>
                <td className="border border-outline-variant/30 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => verIntervenciones(p)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-label-lg font-bold text-primary transition-colors hover:bg-primary/10 print:hidden"
                  >
                    <ListTree className="size-3.5" />
                    Ver intervenciones
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
