// =============================================================================
// MetasStrip — resumen del convenio PARA EL COMPONENTE ACTIVO.
// Fuente: getResumenComponente() (vistas sgs_v_indicador_*, migración 36).
// Server component. Si no hay componente (Todos) muestra los 10 indicadores.
// =============================================================================

import Link from "next/link";
import { Target, ArrowRight } from "lucide-react";
import { getResumenComponente, normalizarComponente } from "@/lib/repos";
import type { AccionCode } from "@/lib/acciones";
import {
  ESTADO_BAR,
  ESTADO_TEXT,
  ESTADO_LABEL,
  METODOLOGIA_SEMAFORO,
} from "@/lib/estado-indicador";

export async function MetasStrip({
  componente = null,
  accion = null,
}: {
  componente?: string | null;
  /** T1 filtro-accion: codigo CxAy del catalogo canonico. */
  accion?: AccionCode | null;
}) {
  const comp = normalizarComponente(componente);
  const { indicadores, cumplidas, totalIndicadores, pctGlobal, etiqueta } =
    await getResumenComponente(comp, accion);

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="size-5" />
          </span>
          <div>
            <h2 className="text-title-md font-bold text-on-surface">Metas · {etiqueta}</h2>
            <p className="text-[11px] text-on-surface-variant">
              {cumplidas} de {totalIndicadores} metas cumplidas · avance del {pctGlobal}%
            </p>
            {indicadores.length > 0 && (
              <p className="mt-0.5 text-[10px] text-on-surface-variant/70">
                {METODOLOGIA_SEMAFORO}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-surface-variant/50">
              <div className="h-full bg-primary" style={{ width: `${pctGlobal}%` }} />
            </div>
            <span className="text-title-md font-bold text-primary">{pctGlobal}%</span>
          </div>
          <Link
            href="/metas/convenio"
            className="inline-flex items-center gap-1 text-label-lg font-bold text-primary hover:underline"
          >
            Ver detalle <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </header>

      {indicadores.length === 0 ? (
        <p className="py-6 text-center text-sm text-on-surface-variant">
          Este componente no tiene indicadores configurados.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {indicadores.map((ind) => {
            const bar = ESTADO_BAR[ind.estado];
            const text = ESTADO_TEXT[ind.estado];
            const label = ESTADO_LABEL[ind.estado];
            return (
              <div
                key={ind.key}
                className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-3"
              >
                <div className="flex items-start justify-between gap-1">
                  <p
                    className="truncate text-[11px] text-on-surface-variant"
                    title={ind.label}
                  >
                    {ind.label}
                  </p>
                  <span className="shrink-0 rounded bg-surface-variant/60 px-1 text-[9px] font-bold text-on-surface-variant">
                    {ind.accion}
                  </span>
                </div>
                <p className="mt-1 text-lg font-bold leading-none text-on-surface">
                  {ind.actual.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                  <span className="ml-1 text-[11px] font-normal text-on-surface-variant">
                    / {ind.meta} {ind.unidad}
                  </span>
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-variant/40">
                  <div
                    className={`h-full ${bar}`}
                    style={{ width: `${Math.min(100, ind.pct)}%` }}
                  />
                </div>
                <p className={`mt-1 text-[10px] font-bold ${text}`}>
                  {ind.pct}% · {label}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
