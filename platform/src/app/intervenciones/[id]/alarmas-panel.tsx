"use client";

// =============================================================================
// AlarmasPanel — DEEPSEEK-F2.3
// Panel para reportar problemas/necesidades sobre una intervención:
//   - "Requiere firma del propietario"
//   - "No autorizada por la comunidad"
//   - "Problema técnico"
//   - "Requiere visita"
//   - "Otro"
//
// Las alarmas tienen ciclo de vida (creación → resolución) y son visibles
// para todo el equipo. ADMIN/GESTOR pueden crear y resolver; ANALISTA solo
// puede verlas.
// =============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Check,
  Plus,
  Loader2,
  CircleAlert,
  Clock,
} from "lucide-react";
import type { AlarmaPropuesta } from "@/lib/repos/propuestas";

const TIPOS: Array<{ key: AlarmaPropuesta["tipo"]; label: string }> = [
  { key: "firma_pendiente", label: "Requiere firma del propietario" },
  { key: "no_autorizada_comunidad", label: "No autorizada por la comunidad" },
  { key: "problema_tecnico", label: "Problema técnico" },
  { key: "requiere_visita", label: "Requiere visita" },
  { key: "otro", label: "Otro" },
];

const TIPOS_LABEL: Record<AlarmaPropuesta["tipo"], string> = Object.fromEntries(
  TIPOS.map((t) => [t.key, t.label]),
) as Record<AlarmaPropuesta["tipo"], string>;

function fmtFecha(d: Date | null): string {
  if (!d) return "—";
  try {
    return d.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return d.toISOString();
  }
}

export function AlarmasPanel({
  idPropuesta,
  idUsuario,
  alarmasInicial,
  canEdit,
}: {
  idPropuesta: number;
  idUsuario: number | null;
  alarmasInicial: AlarmaPropuesta[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [alarmas, setAlarmas] = useState<AlarmaPropuesta[]>(alarmasInicial);
  const [openForm, setOpenForm] = useState(false);
  const [tipo, setTipo] = useState<AlarmaPropuesta["tipo"]>("firma_pendiente");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!descripcion.trim()) {
      setError("Indica una descripción.");
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("idPropuesta", String(idPropuesta));
        fd.set("tipo", tipo);
        fd.set("descripcion", descripcion);
        const r = await fetch("/api/intervenciones/alarmas", {
          method: "POST",
          body: fd,
        });
        const data = (await r.json()) as { ok?: boolean; alarma?: AlarmaPropuesta; error?: string };
        if (!r.ok || !data.ok || !data.alarma) {
          setError(data.error ?? `Error ${r.status}`);
          return;
        }
        setAlarmas((cur) => [data.alarma!, ...cur]);
        setDescripcion("");
        setOpenForm(false);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const resolver = (idAlarma: number) => {
    const nota = window.prompt("Nota de resolución (opcional):") ?? "";
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("idAlarma", String(idAlarma));
        fd.set("notaResolucion", nota);
        const r = await fetch("/api/intervenciones/alarmas", {
          method: "PATCH",
          body: fd,
        });
        const data = (await r.json()) as { ok?: boolean; error?: string };
        if (!r.ok || !data.ok) {
          setError(data.error ?? `Error ${r.status}`);
          return;
        }
        setAlarmas((cur) =>
          cur.map((a) =>
            a.idAlarma === idAlarma
              ? {
                  ...a,
                  resuelta: true,
                  resueltaEn: new Date(),
                  resueltaPor: idUsuario,
                  notaResolucion: nota,
                }
              : a,
          ),
        );
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const activas = alarmas.filter((a) => !a.resuelta);
  const resueltas = alarmas.filter((a) => a.resuelta);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-title-md font-bold text-on-surface">
          <AlertTriangle className="size-5 text-warning" />
          Alarmas y problemas
        </h2>
        {canEdit && !openForm && (
          <Button onClick={() => setOpenForm(true)} variant="outline">
            <Plus className="size-4" />
            Reportar problema
          </Button>
        )}
      </div>

      {openForm && (
        <Card className="mb-4 border-warning/40 bg-warning/5 p-4">
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label
                htmlFor="alarma-tipo"
                className="mb-1 block text-label-lg font-bold text-on-surface"
              >
                Tipo
              </label>
              <select
                id="alarma-tipo"
                value={tipo}
                onChange={(e) =>
                  setTipo(e.target.value as AlarmaPropuesta["tipo"])
                }
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
              >
                {TIPOS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="alarma-descripcion"
                className="mb-1 block text-label-lg font-bold text-on-surface"
              >
                Descripción
              </label>
              <textarea
                id="alarma-descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                required
                placeholder="Detalla el problema…"
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
              />
            </div>
            {error && (
              <p className="rounded-md border border-error/40 bg-error/10 p-2 text-body-sm text-error">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenForm(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CircleAlert className="size-4" />
                )}
                Reportar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {alarmas.length === 0 ? (
        <p className="rounded-md border border-dashed border-outline-variant bg-surface-container-low p-4 text-center text-body-sm text-on-surface-variant">
          Sin alarmas reportadas.
        </p>
      ) : (
        <div className="space-y-3">
          {activas.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase text-warning">
                Activas ({activas.length})
              </p>
              <ul className="space-y-2">
                {activas.map((a) => (
                  <li
                    key={a.idAlarma}
                    className="rounded-lg border-l-4 border-warning bg-warning/5 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-label-lg font-bold text-on-surface">
                          {TIPOS_LABEL[a.tipo]}
                        </p>
                        {a.descripcion && (
                          <p className="mt-0.5 text-body-sm text-on-surface">
                            {a.descripcion}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-on-surface-variant">
                          <Clock className="mr-1 inline size-3" />
                          {fmtFecha(a.creadoEn)}
                          {a.creadoPorEmail && ` · ${a.creadoPorEmail}`}
                        </p>
                      </div>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolver(a.idAlarma)}
                          disabled={isPending}
                        >
                          <Check className="size-3" />
                          Resolver
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {resueltas.length > 0 && (
            <details className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
              <summary className="cursor-pointer text-[10px] font-bold uppercase text-on-surface-variant">
                Resueltas ({resueltas.length})
              </summary>
              <ul className="mt-2 space-y-2">
                {resueltas.map((a) => (
                  <li
                    key={a.idAlarma}
                    className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-3 opacity-70"
                  >
                    <p className="text-label-lg font-bold text-on-surface line-through">
                      {TIPOS_LABEL[a.tipo]}
                    </p>
                    {a.descripcion && (
                      <p className="mt-0.5 text-body-sm text-on-surface-variant">
                        {a.descripcion}
                      </p>
                    )}
                    {a.notaResolucion && (
                      <p className="mt-1 text-[10px] text-on-surface-variant">
                        Resolución: {a.notaResolucion}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-on-surface-variant">
                      {fmtFecha(a.creadoEn)} → {fmtFecha(a.resueltaEn)}
                      {a.resueltaPorEmail && ` · ${a.resueltaPorEmail}`}
                    </p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
