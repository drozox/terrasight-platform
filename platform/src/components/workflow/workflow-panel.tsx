"use client";

// =============================================================================
// WorkflowPanel — UI de aprobación de intervenciones
//
// Sprint 20 (P0 del plan v1.0). Muestra:
//   - Estado actual como badge
//   - Botones de transición disponibles para el rol del usuario
//   - Campo de comentario (requerido para RECHAZADA)
//   - Historial de transiciones (audit trail)
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Send, Play, Square, RotateCcw, FileText, History } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ESTADO_LABEL,
  ESTADO_COLOR,
  getTransiciones,
  type EstadoPropuesta,
  type RolUsuario,
  type Transicion,
  type HistorialEntry,
} from "@/lib/repos/workflow-types";

const TRANSITION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "Aprobar":           CheckCircle2,
  "Rechazar":          XCircle,
  "Enviar a revisión": Send,
  "Iniciar ejecución": Play,
  "Finalizar":         Square,
  "Reabrir como borrador": RotateCcw,
};

const TRANSITION_BG: Record<string, string> = {
  "Aprobar":           "bg-primary text-on-primary hover:opacity-90",
  "Rechazar":          "bg-error text-on-error hover:opacity-90",
  "Enviar a revisión": "bg-amber-500 text-white hover:opacity-90",
  "Iniciar ejecución": "bg-emerald-600 text-white hover:opacity-90",
  "Finalizar":         "bg-emerald-700 text-white hover:opacity-90",
  "Reabrir como borrador": "bg-slate-500 text-white hover:opacity-90",
};

export function WorkflowPanel({
  idPropuesta,
  estadoActual,
  rol,
  email,
  historialInicial,
}: {
  idPropuesta: number;
  estadoActual: EstadoPropuesta;
  rol: RolUsuario;
  email: string;
  historialInicial: HistorialEntry[];
}) {
  const router = useRouter();
  const [estado, setEstado] = React.useState<EstadoPropuesta>(estadoActual);
  const [historial, setHistorial] = React.useState<HistorialEntry[]>(historialInicial);
  const [pendingTrans, setPendingTrans] = React.useState<Transicion | null>(null);
  const [comentario, setComentario] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);

  const transiciones = React.useMemo(() => getTransiciones(estado, rol), [estado, rol]);

  async function handleTransicion(t: Transicion) {
    if (t.requiresComment) {
      setPendingTrans(t);
      setError(null);
      return;
    }
    await submit(t, "");
  }

  async function submitWithComment() {
    if (!pendingTrans) return;
    if (pendingTrans.requiresComment && !comentario.trim()) {
      setError("Comentario requerido");
      return;
    }
    await submit(pendingTrans, comentario);
    setPendingTrans(null);
    setComentario("");
  }

  async function submit(t: Transicion, c: string) {
    setIsSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/workflow/transicion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_propuesta: idPropuesta,
          from: estado,
          to: t.to,
          comentario: c || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Error al aplicar transición");
        return;
      }
      setEstado(t.to);
      // Refrescar historial
      const h = await fetch(`/api/workflow/historial?id_propuesta=${idPropuesta}`);
      if (h.ok) {
        const hd = await h.json();
        setHistorial(hd.historial as HistorialEntry[]);
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-on-surface">Workflow de aprobación</h2>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
            ESTADO_COLOR[estado],
          )}
        >
          {ESTADO_LABEL[estado]}
        </span>
      </header>

      {/* Acciones disponibles */}
      {transiciones.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {transiciones.map((t) => {
            const Icon = TRANSITION_ICON[t.label] ?? FileText;
            return (
              <button
                key={t.label}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleTransicion(t)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50",
                  TRANSITION_BG[t.label] ?? "bg-surface-container text-on-surface",
                )}
                title={t.description}
              >
                <Icon className="size-4" aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-xs text-on-surface-variant">
          No hay transiciones disponibles para tu rol ({rol}) en el estado {ESTADO_LABEL[estado]}.
          {estado === "FINALIZADA" && " Estado terminal."}
        </p>
      )}

      {/* Modal-like inline para comentario */}
      {pendingTrans && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">
            {pendingTrans.label} — comentario requerido
          </p>
          <p className="mt-1 text-xs text-amber-800">{pendingTrans.description}</p>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            placeholder="Justificación u observaciones…"
            className="mt-2 w-full rounded border border-amber-300 bg-white p-2 text-sm focus:border-amber-500 focus:outline-none"
            aria-label="Comentario de la transición"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={submitWithComment}
              className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {isSubmitting ? "Enviando…" : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingTrans(null);
                setComentario("");
                setError(null);
              }}
              className="rounded border border-amber-300 bg-white px-3 py-1 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-error" role="alert">
          {error}
        </p>
      )}

      {/* Historial */}
      <div className="mt-4 border-t border-outline-variant pt-3">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface"
          aria-expanded={showHistory}
        >
          <History className="size-4" aria-hidden="true" />
          Historial ({historial.length})
        </button>
        {showHistory && (
          <ol className="mt-2 space-y-2">
            {historial.map((h) => (
              <li
                key={h.id_historial}
                className="flex gap-3 rounded border border-outline-variant/40 bg-surface-container-low p-2 text-xs"
              >
                <div className="flex-1">
                  <p className="font-medium text-on-surface">
                    {h.estado_anterior ? (
                      <>
                        <span className="text-on-surface-variant">
                          {ESTADO_LABEL[h.estado_anterior]}
                        </span>
                        {" → "}
                        <span className="font-bold">{ESTADO_LABEL[h.estado_nuevo]}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-on-surface-variant">Creada en </span>
                        <span className="font-bold">{ESTADO_LABEL[h.estado_nuevo]}</span>
                      </>
                    )}
                  </p>
                  {h.comentario && (
                    <p className="mt-1 italic text-on-surface-variant">"{h.comentario}"</p>
                  )}
                  <p className="mt-1 text-[10px] text-on-surface-variant">
                    {h.usuario ?? "sistema"}
                    {h.rol && ` · ${h.rol}`}
                    {" · "}
                    {new Date(h.created_at).toLocaleString("es-CO")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
