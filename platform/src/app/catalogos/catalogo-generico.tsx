"use client";

// =============================================================================
// CatalogoGenerico — Componente cliente GENERICO para catalogos secundarios
// (HU-TC-06..10). Parametrizable via props (ver CatalogoGenericoProps).
// Sub-componente: GenericForm (en catalogo-generico-form.tsx) maneja el
// render de inputs. Patron visual replica catalogos-panels.tsx (HU-TC-03).
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { GenericForm } from "./catalogo-generico-form";

// -----------------------------------------------------------------------------
// Tipos exportados: FieldDef, ColumnDef, CatalogoGenericoProps.
// -----------------------------------------------------------------------------

export type FieldDef<T> = {
  name: keyof T;
  label: string;
  type: "string" | "number" | "boolean" | "enum" | "select";
  required?: boolean;
  min?: number;
  max?: number;
  values?: readonly string[];
  options?: { value: number | string; label: string }[];
  placeholder?: string;
  hint?: string;
};

export type ColumnDef<T> = {
  key: keyof T | string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
};

type ActionResult = { ok: boolean; message: string };
type ActionFn = (fd: FormData) => Promise<ActionResult>;

export type CatalogoGenericoProps<
  T extends { createdAt: Date | null; updatedAt: Date | null },
> = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  data: T[];
  columns: ColumnDef<T>[];
  fields: FieldDef<T>[];
  pkName: keyof T;
  canEdit: boolean;
  dependenciasMessage?: (row: T) => string;
  actions: { onCreate: ActionFn; onUpdate: ActionFn; onDelete: ActionFn };
  emptyMessage?: string;
};

type Flash = { tipo: "ok" | "error"; msg: string };

// =============================================================================
// Componente principal
// =============================================================================
export function CatalogoGenerico<
  T extends {
    createdAt: Date | null;
    updatedAt: Date | null;
  } & Record<string, unknown>,
>(props: CatalogoGenericoProps<T>) {
  const {
    title, description, icon: Icon, data, columns, fields, pkName,
    canEdit, dependenciasMessage, actions,
    emptyMessage = "Sin registros.",
  } = props;

  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [editId, setEditId] = React.useState<unknown | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [flash, setFlash] = React.useState<Flash | null>(null);

  function showFlash(f: Flash) {
    setFlash(f);
    if (f.tipo === "ok") setTimeout(() => setFlash(null), 3500);
  }

  function done() {
    setBusy(false);
    setEditId(null);
    setCreateOpen(false);
    router.refresh();
  }

  const editingRow = editId == null
    ? null
    : data.find((r) => r[pkName] === editId) ?? null;

  return (
    <>
      <div className="flex items-center justify-between border-b border-outline-variant p-4">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-primary" />
          <div>
            <h2 className="text-base font-bold text-on-surface">{title}</h2>
            <p className="text-[11px] text-on-surface-variant">{description}</p>
          </div>
        </div>
        {canEdit && !createOpen && (
          <button
            onClick={() => setCreateOpen(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="size-3.5" /> Nuevo
          </button>
        )}
      </div>

      {flash && (
        <div
          role="status"
          className={
            flash.tipo === "ok"
              ? "flex items-start gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2 text-body-sm text-primary"
              : "flex items-start gap-2 border-b border-error/30 bg-error/5 px-4 py-2 text-body-sm text-error"
          }
        >
          {flash.tipo === "ok"
            ? <CheckCircle2 className="mt-0.5 size-4 flex-shrink-0" />
            : <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />}
          <span>{flash.msg}</span>
        </div>
      )}

      {createOpen && (
        <div className="border-b border-outline-variant bg-surface-container-low/40 p-3">
          <GenericForm
            fields={fields}
            pkName={pkName}
            initial={{} as Partial<T>}
            submitLabel="Crear"
            disabled={busy}
            onCancel={() => setCreateOpen(false)}
            onSubmit={async (fd) => {
              setBusy(true);
              const res = await actions.onCreate(fd);
              if (res.ok) showFlash({ tipo: "ok", msg: res.message });
              else showFlash({ tipo: "error", msg: res.message });
              if (res.ok) done();
              else setBusy(false);
            }}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low text-[11px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  className={
                    "px-4 py-3 font-semibold " +
                    (c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "")
                  }
                >
                  {c.label}
                </th>
              ))}
              {canEdit && <th className="px-4 py-3 text-right font-semibold">UI</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (canEdit ? 1 : 0)}
                  className="px-4 py-8 text-center text-on-surface-variant"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {data.map((row) => {
              const id = row[pkName] as unknown;
              const isEditing = editId === id;
              const dep = dependenciasMessage?.(row) ?? "";
              const rowIndex = String(id);
              return (
                <React.Fragment key={rowIndex}>
                  <tr className="hover:bg-surface-container-low/40">
                    {columns.map((c) => {
                      const align =
                        c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "";
                      const cellContent = c.render
                        ? c.render(row)
                        : ((row as Record<string, unknown>)[c.key as string] as React.ReactNode) ?? "—";
                      return (
                        <td key={String(c.key)} className={`px-4 py-3 ${align}`}>
                          {cellContent}
                        </td>
                      );
                    })}
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            title="Editar"
                            onClick={() => setEditId(isEditing ? null : id)}
                            disabled={busy}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface disabled:opacity-50"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            title={dep || "Eliminar"}
                            disabled={busy || Boolean(dep)}
                            onClick={async () => {
                              if (!confirm("¿Eliminar el registro? Esta accion no se puede deshacer.")) return;
                              setBusy(true);
                              const fd = new FormData();
                              fd.set(String(pkName), String(id));
                              const res = await actions.onDelete(fd);
                              if (res.ok) showFlash({ tipo: "ok", msg: res.message });
                              else showFlash({ tipo: "error", msg: res.message });
                              done();
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-error/70 hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {isEditing && editingRow && (
                    <tr className="bg-surface-container-low/60">
                      <td colSpan={columns.length + (canEdit ? 1 : 0)} className="px-4 py-3">
                        <GenericForm
                          fields={fields}
                          pkName={pkName}
                          initial={editingRow}
                          submitLabel="Guardar"
                          disabled={busy}
                          onCancel={() => setEditId(null)}
                          onSubmit={async (fd) => {
                            setBusy(true);
                            const res = await actions.onUpdate(fd);
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
    </>
  );
}
