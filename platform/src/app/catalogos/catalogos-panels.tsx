"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, PackageOpen, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ComponenteFull, AccionFull } from "@/lib/repository";
import {
  eliminarComponenteAction, eliminarAccionAction,
  actualizarComponenteAction, actualizarAccionAction,
} from "./actions";
import {
  CreateComponenteForm, EditComponenteForm,
  CreateAccionForm, EditAccionForm,
} from "./catalogos-forms";

type Flash = { tipo: "ok" | "error"; msg: string };

const COMPONENT_COLOR: Record<string, "primary" | "secondary" | "tertiary"> = {
  C1: "primary", C2: "secondary", C3: "tertiary",
};// =============================================================================
// Panel de componentes
// =============================================================================

export function ComponentesPanel({
  componentes, busy, onBusyChange, showFlash,
}: {
  componentes: ComponenteFull[];
  busy: boolean;
  onBusyChange: (b: boolean) => void;
  showFlash: (f: Flash) => void;
}) {
  const router = useRouter();
  const [editId, setEditId] = React.useState<number | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  function done() {
    onBusyChange(false);
    setEditId(null);
    setCreateOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-outline-variant p-4">
        <div className="flex items-center gap-2">
          <PackageOpen className="size-5 text-primary" />
          <div>
            <h2 className="text-base font-bold text-on-surface">Componentes</h2>
            <p className="text-[11px] text-on-surface-variant">
              {componentes.length} registros · catálogo cerrado del modelo BDG
            </p>
          </div>
        </div>
        {!createOpen && (
          <button
            onClick={() => setCreateOpen(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="size-3.5" />Nuevo
          </button>
        )}
      </div>

      {createOpen && (
        <div className="border-b border-outline-variant bg-surface-container-low/40 p-3">
          <CreateComponenteForm
            disabled={busy}
            onCancel={() => setCreateOpen(false)}
            onSubmit={async (fd) => {
              onBusyChange(true);
              const { crearComponenteAction } = await import("./actions");
              const res = await crearComponenteAction(fd);
              if (res.ok) showFlash({ tipo: "ok", msg: res.message });
              else showFlash({ tipo: "error", msg: res.message });
              if (res.ok) done();
              else onBusyChange(false);
            }}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low text-[11px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              <th className="px-4 py-3 text-right font-semibold">Propuestas</th>
              <th className="px-4 py-3 text-right font-semibold">UI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {componentes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-on-surface-variant">Sin componentes registrados.</td>
              </tr>
            )}
            {componentes.map((c) => {
              const isEditing = editId === c.idComponente;
              const bloqueado = c.totalAcciones > 0 || c.totalPropuestas > 0;
              return (
                <React.Fragment key={c.idComponente}>
                  <tr className="hover:bg-surface-container-low/40">
                    <td className="px-4 py-3">
                      {COMPONENT_COLOR[c.nombre] ? (
                        <Badge variant={COMPONENT_COLOR[c.nombre]}>{c.nombre}</Badge>
                      ) : (
                        <span className="font-mono font-bold">{c.nombre}</span>
                      )}
                      <span className="ml-2 text-[11px] text-on-surface-variant">#{c.idComponente}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[12px]">{c.totalAcciones}</td>
                    <td className="px-4 py-3 text-right font-mono text-[12px]">{c.totalPropuestas}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button title="Editar" onClick={() => setEditId(isEditing ? null : c.idComponente)} disabled={busy}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface disabled:opacity-50">
                          <Pencil className="size-4" />
                        </button>
                        <button title={bloqueado ? "Bloqueado: tiene acciones o propuestas vinculadas" : "Eliminar"}
                          disabled={busy || bloqueado}
                          onClick={async () => {
                            if (!confirm(`¿Eliminar el componente "${c.nombre}"?`)) return;
                            onBusyChange(true);
                            const fd = new FormData();
                            fd.set("idComponente", String(c.idComponente));
                            const res = await eliminarComponenteAction(fd);
                            if (res.ok) showFlash({ tipo: "ok", msg: res.message });
                            else showFlash({ tipo: "error", msg: res.message });
                            done();
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-error/70 hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-30">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isEditing && (
                    <tr className="bg-surface-container-low/60">
                      <td colSpan={4} className="px-4 py-3">
                        <EditComponenteForm
                          componente={c}
                          disabled={busy}
                          onCancel={() => setEditId(null)}
                          onSubmit={async (fd) => {
                            onBusyChange(true);
                            const res = await actualizarComponenteAction(fd);
                            if (res.ok) showFlash({ tipo: "ok", msg: res.message });
                            else showFlash({ tipo: "error", msg: res.message });
                            if (res.ok) done();
                            else onBusyChange(false);
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
    </>
  );
}// =============================================================================
// Panel de acciones (agrupadas por componente)
// =============================================================================

export function AccionesPanel({
  acciones, componentes, busy, onBusyChange, showFlash,
}: {
  acciones: AccionFull[];
  componentes: ComponenteFull[];
  busy: boolean;
  onBusyChange: (b: boolean) => void;
  showFlash: (f: Flash) => void;
}) {
  const router = useRouter();
  const [editId, setEditId] = React.useState<number | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  function done() {
    onBusyChange(false);
    setEditId(null);
    setCreateOpen(false);
    router.refresh();
  }

  const porComponente = React.useMemo(() => {
    const map = new Map<number, AccionFull[]>();
    for (const c of componentes) map.set(c.idComponente, []);
    for (const a of acciones) {
      const arr = map.get(a.idComponente) ?? [];
      arr.push(a);
      map.set(a.idComponente, arr);
    }
    return map;
  }, [componentes, acciones]);

  return (
    <>
      <div className="flex items-center justify-between border-b border-outline-variant p-4">
        <div className="flex items-center gap-2">
          <Link2 className="size-5 text-secondary" />
          <div>
            <h2 className="text-base font-bold text-on-surface">Acciones</h2>
            <p className="text-[11px] text-on-surface-variant">
              {acciones.length} registros · agrupadas por componente
            </p>
          </div>
        </div>
        {!createOpen && (
          <button
            onClick={() => setCreateOpen(true)}
            disabled={busy || componentes.length === 0}
            title={componentes.length === 0 ? "Crea primero un componente" : "Nueva acción"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-on-secondary transition-all hover:bg-secondary/90 disabled:opacity-50"
          >
            <Plus className="size-3.5" />Nueva
          </button>
        )}
      </div>

      {createOpen && (
        <div className="border-b border-outline-variant bg-surface-container-low/40 p-3">
          <CreateAccionForm
            componentes={componentes}
            disabled={busy}
            onCancel={() => setCreateOpen(false)}
            onSubmit={async (fd) => {
              onBusyChange(true);
              const { crearAccionAction } = await import("./actions");
              const res = await crearAccionAction(fd);
              if (res.ok) showFlash({ tipo: "ok", msg: res.message });
              else showFlash({ tipo: "error", msg: res.message });
              if (res.ok) done();
              else onBusyChange(false);
            }}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low text-[11px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-semibold">Componente</th>
              <th className="px-4 py-3 font-semibold">Acción</th>
              <th className="px-4 py-3 text-right font-semibold">Propuestas</th>
              <th className="px-4 py-3 text-right font-semibold">UI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {acciones.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-on-surface-variant">Sin acciones registradas.</td>
              </tr>
            )}
            {componentes.map((c) => {
              const accs = porComponente.get(c.idComponente) ?? [];
              if (accs.length === 0) return null;
              return (
                <React.Fragment key={`c-${c.idComponente}`}>
                  {accs.map((a, i) => {
                    const isEditing = editId === a.idAccion;
                    const bloqueada = a.totalPropuestas > 0;
                    return (
                      <React.Fragment key={a.idAccion}>
                        <tr className="hover:bg-surface-container-low/40">
                          <td className="px-4 py-3">
                            {i === 0 && COMPONENT_COLOR[c.nombre] ? (
                              <Badge variant={COMPONENT_COLOR[c.nombre]}>{c.nombre}</Badge>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 font-bold text-on-surface">
                            <span className="font-mono">{a.nombre}</span>
                            <span className="ml-2 text-[11px] text-on-surface-variant">#{a.idAccion}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[12px]">{a.totalPropuestas}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button title="Editar" onClick={() => setEditId(isEditing ? null : a.idAccion)} disabled={busy}
                                className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface disabled:opacity-50">
                                <Pencil className="size-4" />
                              </button>
                              <button title={bloqueada ? `Bloqueado: ${a.totalPropuestas} propuesta(s) la referencian` : "Eliminar"}
                                disabled={busy || bloqueada}
                                onClick={async () => {
                                  if (!confirm(`¿Eliminar la accion "${a.nombre}" de ${a.nombreComponente}?`)) return;
                                  onBusyChange(true);
                                  const fd = new FormData();
                                  fd.set("idAccion", String(a.idAccion));
                                  const res = await eliminarAccionAction(fd);
                                  if (res.ok) showFlash({ tipo: "ok", msg: res.message });
                                  else showFlash({ tipo: "error", msg: res.message });
                                  done();
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-md text-error/70 hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-30">
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isEditing && (
                          <tr className="bg-surface-container-low/60">
                            <td colSpan={4} className="px-4 py-3">
                              <EditAccionForm
                                accion={a}
                                componentes={componentes}
                                disabled={busy}
                                onCancel={() => setEditId(null)}
                                onSubmit={async (fd) => {
                                  onBusyChange(true);
                                  const res = await actualizarAccionAction(fd);
                                  if (res.ok) showFlash({ tipo: "ok", msg: res.message });
                                  else showFlash({ tipo: "error", msg: res.message });
                                  if (res.ok) done();
                                  else onBusyChange(false);
                                }}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}