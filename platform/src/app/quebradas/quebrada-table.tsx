"use client";

// =============================================================================
// Tabla de quebradas + acciones inline. Mismo patrón que predios.
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Power, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  actualizarQuebradaAction,
  eliminarQuebradaAction,
} from "./actions";
import type { QuebradaFull, MunicipioMini } from "@/lib/types";

export function QuebradaTable({
  quebradas,
  municipios,
  canEdit,
}: {
  quebradas: QuebradaFull[];
  municipios: MunicipioMini[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editId, setEditId] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [flash, setFlash] = React.useState<{ tipo: "ok" | "error"; msg: string } | null>(null);

  function showFlash(f: { tipo: "ok" | "error"; msg: string }) {
    setFlash(f);
    if (f.tipo === "ok") setTimeout(() => setFlash(null), 3500);
  }

  function done() {
    setBusy(false);
    setEditId(null);
    router.refresh();
  }

  return (
    <div className="space-y-3 p-3">
      {flash && (
        <div
          role="status"
          className={
            flash.tipo === "ok"
              ? "flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-body-sm text-primary"
              : "flex items-start gap-2 rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error"
          }
        >
          {flash.tipo === "ok"
            ? <CheckCircle2 className="mt-0.5 size-4 flex-shrink-0" />
            : <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />}
          <span>{flash.msg}</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low text-[11px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold text-right">Lat / Lon</th>
              <th className="px-4 py-3 font-semibold text-right">Área</th>
              <th className="px-4 py-3 font-semibold">Municipio</th>
              {canEdit && <th className="px-4 py-3 text-right font-semibold">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {quebradas.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-on-surface-variant">
                  Sin quebradas registradas.
                </td>
              </tr>
            )}
            {quebradas.map((q) => {
              const mun = q.idMunicipio ? municipios.find((m) => m.idMunicipio === q.idMunicipio) : null;
              const isEditing = editId === q.idQuebrada;
              return (
                <React.Fragment key={q.idQuebrada}>
                  <tr className="hover:bg-surface-container-low/40">
                    <td className="px-4 py-3 font-mono text-[12px] text-on-surface-variant">
                      #{q.idQuebrada}
                    </td>
                    <td className="px-4 py-3 font-bold text-on-surface">{q.nombreQuebrada}</td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] text-on-surface-variant">
                      {q.latitud.toFixed(4)}, {q.longitud.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] text-on-surface">
                      {q.area.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {mun?.nombreMunicipio ?? <span className="text-on-surface-variant/50">—</span>}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            title="Editar"
                            onClick={() => setEditId(isEditing ? null : q.idQuebrada)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface"
                            disabled={busy}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            title="Eliminar"
                            disabled={busy}
                            onClick={async () => {
                              if (!confirm(`¿Eliminar la quebrada "${q.nombreQuebrada}"?`)) return;
                              setBusy(true);
                              const fd = new FormData();
                              fd.set("idQuebrada", String(q.idQuebrada));
                              const res = await eliminarQuebradaAction(fd);
                              if (res.ok) showFlash({ tipo: "ok", msg: res.message });
                              else showFlash({ tipo: "error", msg: res.message });
                              done();
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-error/70 hover:bg-error/10 hover:text-error"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>

                  {isEditing && (
                    <tr className="bg-surface-container-low/60">
                      <td colSpan={canEdit ? 6 : 5} className="px-4 py-3">
                        <EditForm
                          quebrada={q}
                          municipios={municipios}
                          disabled={busy}
                          onCancel={() => setEditId(null)}
                          onSubmit={async (fd) => {
                            setBusy(true);
                            const res = await actualizarQuebradaAction(fd);
                            if (res.ok) showFlash({ tipo: "ok", msg: res.message });
                            else showFlash({ tipo: "error", msg: res.message });
                            if (res.ok) done();
                            else setBusy(false);
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
    </div>
  );
}

function EditForm({
  quebrada,
  municipios,
  disabled,
  onSubmit,
  onCancel,
}: {
  quebrada: QuebradaFull;
  municipios: MunicipioMini[];
  disabled: boolean;
  onSubmit: (fd: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <form
      action={onSubmit}
      className="grid grid-cols-1 gap-3 md:grid-cols-4"
    >
      <input type="hidden" name="idQuebrada" value={quebrada.idQuebrada} />
      <label className="md:col-span-2 block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Nombre</span>
        <input
          name="nombreQuebrada"
          type="text"
          defaultValue={quebrada.nombreQuebrada}
          required
          className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Latitud</span>
        <input
          name="latitud"
          type="number"
          step="0.000001"
          min={-90}
          max={90}
          defaultValue={quebrada.latitud}
          required
          className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Longitud</span>
        <input
          name="longitud"
          type="number"
          step="0.000001"
          min={-180}
          max={180}
          defaultValue={quebrada.longitud}
          required
          className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Área (opcional)</span>
        <input
          name="area"
          type="number"
          step="0.01"
          min={0}
          defaultValue={quebrada.area}
          className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Municipio</span>
        <select
          name="idMunicipio"
          defaultValue={quebrada.idMunicipio ?? ""}
          className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">— Ninguno —</option>
          {municipios.map((m) => (
            <option key={m.idMunicipio} value={m.idMunicipio}>{m.nombreMunicipio}</option>
          ))}
        </select>
      </label>
      <div className="md:col-span-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="h-9 rounded-lg border border-outline-variant px-4 text-sm font-semibold hover:bg-surface-variant/40 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {disabled && <Loader2 className="size-4 animate-spin" />}
          Guardar
        </button>
      </div>
    </form>
  );
}

// Marcamos Power como usado por si lo referenciamos luego en variantes futuras
void Power;
