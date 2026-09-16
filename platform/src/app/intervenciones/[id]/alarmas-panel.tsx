"use client";

// =============================================================================
// AlarmasPanel — DEEPSEEK-F2.3 + AJUSTE 5 (extendidas)
//
// Panel para reportar problemas/necesidades sobre una intervención:
//   - 10 tipos: 5 originales + 5 nuevos (permiso_ambiental, conflicto_linderos,
//     acceso_bloqueado, materiales_insuficientes, problema_climatico)
//   - prioridad (ALTA / MEDIA / BAJA)
//   - responsable (dropdown usuarios activos)
//   - fecha_estimada (date)
//   - evidencia_url (URL o path a foto/documento)
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
  AlertOctagon,
  AlertCircle,
  CheckCircle2,
  Check,
  Plus,
  Loader2,
  CircleAlert,
  Clock,
  ExternalLink,
  CalendarClock,
} from "lucide-react";
import type { AlarmaPropuesta, UsuarioMini } from "@/lib/repos/propuestas";

const TIPOS: Array<{ key: AlarmaPropuesta["tipo"]; label: string }> = [
  { key: "firma_pendiente", label: "Requiere firma del propietario" },
  { key: "no_autorizada_comunidad", label: "No autorizada por la comunidad" },
  { key: "problema_tecnico", label: "Problema técnico" },
  { key: "requiere_visita", label: "Requiere visita" },
  // Nuevos (AJUSTE 5):
  { key: "permiso_ambiental", label: "Requiere permiso ambiental" },
  { key: "conflicto_linderos", label: "Conflicto de linderos" },
  { key: "acceso_bloqueado", label: "Acceso bloqueado" },
  { key: "materiales_insuficientes", label: "Materiales insuficientes" },
  { key: "problema_climatico", label: "Problema climático" },
  { key: "otro", label: "Otro" },
];

const TIPOS_LABEL: Record<AlarmaPropuesta["tipo"], string> = Object.fromEntries(
  TIPOS.map((t) => [t.key, t.label]),
) as Record<AlarmaPropuesta["tipo"], string>;

const PRIORIDADES: Array<{
  key: AlarmaPropuesta["prioridad"];
  label: string;
  Icon: typeof AlertOctagon;
  className: string;
  bgClass: string;
}> = [
  {
    key: "ALTA",
    label: "Alta",
    Icon: AlertOctagon,
    className: "text-error",
    bgClass: "bg-error/10",
  },
  {
    key: "MEDIA",
    label: "Media",
    Icon: AlertTriangle,
    className: "text-warning",
    bgClass: "bg-warning/10",
  },
  {
    key: "BAJA",
    label: "Baja",
    Icon: AlertCircle,
    className: "text-primary",
    bgClass: "bg-primary/10",
  },
];

const PRIORIDAD_META: Record<
  AlarmaPropuesta["prioridad"],
  { Icon: typeof AlertOctagon; className: string; bgClass: string; borderClass: string }
> = {
  ALTA: {
    Icon: AlertOctagon,
    className: "text-error",
    bgClass: "bg-error/10",
    borderClass: "border-error/50",
  },
  MEDIA: {
    Icon: AlertTriangle,
    className: "text-warning",
    bgClass: "bg-warning/10",
    borderClass: "border-warning/50",
  },
  BAJA: {
    Icon: AlertCircle,
    className: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/40",
  },
};

function fmtFecha(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  try {
    return date.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return date.toISOString();
  }
}

function fmtFechaCorta(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  try {
    return date.toLocaleDateString("es-CO", { dateStyle: "short" });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function AlarmasPanel({
  idPropuesta,
  idUsuario,
  alarmasInicial,
  usuarios,
  canEdit,
}: {
  idPropuesta: number;
  idUsuario: number | null;
  alarmasInicial: AlarmaPropuesta[];
  usuarios: UsuarioMini[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [alarmas, setAlarmas] = useState<AlarmaPropuesta[]>(alarmasInicial);
  const [openForm, setOpenForm] = useState(false);
  const [tipo, setTipo] = useState<AlarmaPropuesta["tipo"]>("firma_pendiente");
  const [prioridad, setPrioridad] = useState<AlarmaPropuesta["prioridad"]>("MEDIA");
  const [responsableId, setResponsableId] = useState<string>("");
  const [fechaEstimada, setFechaEstimada] = useState<string>("");
  const [evidenciaUrl, setEvidenciaUrl] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTipo("firma_pendiente");
    setPrioridad("MEDIA");
    setResponsableId("");
    setFechaEstimada("");
    setEvidenciaUrl("");
    setDescripcion("");
    setError(null);
  };

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
        fd.set("prioridad", prioridad);
        if (responsableId) fd.set("responsableId", responsableId);
        if (fechaEstimada) fd.set("fechaEstimada", fechaEstimada);
        if (evidenciaUrl.trim()) fd.set("evidenciaUrl", evidenciaUrl.trim());
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
        resetForm();
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
          {activas.length > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-[10px] font-bold text-on-error">
              {activas.length}
            </span>
          )}
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                  htmlFor="alarma-prioridad"
                  className="mb-1 block text-label-lg font-bold text-on-surface"
                >
                  Prioridad
                </label>
                <select
                  id="alarma-prioridad"
                  value={prioridad}
                  onChange={(e) =>
                    setPrioridad(e.target.value as AlarmaPropuesta["prioridad"])
                  }
                  className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="alarma-responsable"
                  className="mb-1 block text-label-lg font-bold text-on-surface"
                >
                  Responsable
                </label>
                <select
                  id="alarma-responsable"
                  value={responsableId}
                  onChange={(e) => setResponsableId(e.target.value)}
                  className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
                >
                  <option value="">— Sin asignar —</option>
                  {usuarios.map((u) => (
                    <option key={u.idUsuario} value={u.idUsuario}>
                      {u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="alarma-fecha"
                  className="mb-1 block text-label-lg font-bold text-on-surface"
                >
                  Fecha estimada
                </label>
                <input
                  id="alarma-fecha"
                  type="date"
                  value={fechaEstimada}
                  onChange={(e) => setFechaEstimada(e.target.value)}
                  className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
                />
              </div>
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
            <div>
              <label
                htmlFor="alarma-evidencia"
                className="mb-1 block text-label-lg font-bold text-on-surface"
              >
                Evidencia (URL o path)
              </label>
              <input
                id="alarma-evidencia"
                type="url"
                value={evidenciaUrl}
                onChange={(e) => setEvidenciaUrl(e.target.value)}
                placeholder="https://… o /uploads/foto.jpg"
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
                onClick={() => {
                  resetForm();
                  setOpenForm(false);
                }}
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
        <p className="flex items-center justify-center gap-2 rounded-md border border-dashed border-outline-variant bg-surface-container-low p-4 text-center text-body-sm text-on-surface-variant">
          <CheckCircle2 className="size-4 text-primary" />
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
                {activas.map((a) => {
                  const meta = PRIORIDAD_META[a.prioridad];
                  return (
                    <li
                      key={a.idAlarma}
                      className={`rounded-lg border-l-4 p-3 ${meta.bgClass} ${meta.borderClass}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <meta.Icon className={`size-4 ${meta.className}`} />
                            <p className="text-label-lg font-bold text-on-surface">
                              {TIPOS_LABEL[a.tipo]}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${meta.bgClass} ${meta.className}`}
                            >
                              {a.prioridad}
                            </span>
                          </div>
                          {a.descripcion && (
                            <p className="mt-0.5 text-body-sm text-on-surface">
                              {a.descripcion}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-on-surface-variant">
                            <span>
                              <Clock className="mr-1 inline size-3" />
                              {fmtFecha(a.creadoEn)}
                              {a.creadoPorEmail && ` · ${a.creadoPorEmail}`}
                            </span>
                            {a.responsableEmail && (
                              <span>
                                Responsable:{" "}
                                <span className="font-bold">
                                  {a.responsableEmail}
                                </span>
                              </span>
                            )}
                            {a.fechaEstimada && (
                              <span>
                                <CalendarClock className="mr-1 inline size-3" />
                                Est. resolución:{" "}
                                <span className="font-bold">
                                  {fmtFechaCorta(a.fechaEstimada)}
                                </span>
                              </span>
                            )}
                            {a.evidenciaUrl && (
                              <a
                                href={a.evidenciaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                <ExternalLink className="size-3" />
                                Evidencia
                              </a>
                            )}
                          </div>
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
                  );
                })}
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