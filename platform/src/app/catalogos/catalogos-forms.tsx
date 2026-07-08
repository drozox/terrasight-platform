"use client";

import { Loader2 } from "lucide-react";
import type { ComponenteFull, AccionFull } from "@/lib/repository";
import { COMPONENTES_VALIDOS, ACCIONES_VALIDAS } from "@/lib/repository";

const INPUT_CLS =
  "h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const BTN_PRIMARY =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50";

const BTN_SECONDARY =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-on-secondary hover:bg-secondary/90 disabled:opacity-50";

const BTN_GHOST =
  "h-9 rounded-lg border border-outline-variant px-4 text-sm font-semibold hover:bg-surface-variant/40 disabled:opacity-50";// =============================================================================
// COMPONENTE — Create + Edit
// =============================================================================

export function CreateComponenteForm({
  disabled, onCancel, onSubmit,
}: {
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <form action={onSubmit} className="grid grid-cols-1 items-end gap-3 md:grid-cols-3">
      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Nombre</span>
        <select name="nombre" required defaultValue="" className={INPUT_CLS}>
          <option value="" disabled>Seleccionar…</option>
          {COMPONENTES_VALIDOS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
      <div className="md:col-span-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={disabled} className={BTN_GHOST}>Cancelar</button>
        <button type="submit" disabled={disabled} className={BTN_PRIMARY}>
          {disabled && <Loader2 className="size-4 animate-spin" />}Crear
        </button>
      </div>
    </form>
  );
}

export function EditComponenteForm({
  componente, disabled, onCancel, onSubmit,
}: {
  componente: ComponenteFull;
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <form action={onSubmit} className="grid grid-cols-1 items-end gap-3 md:grid-cols-3">
      <input type="hidden" name="idComponente" value={componente.idComponente} />
      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Nombre</span>
        <select name="nombre" required defaultValue={componente.nombre} className={INPUT_CLS}>
          {COMPONENTES_VALIDOS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
      <div className="md:col-span-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={disabled} className={BTN_GHOST}>Cancelar</button>
        <button type="submit" disabled={disabled} className={BTN_PRIMARY}>
          {disabled && <Loader2 className="size-4 animate-spin" />}Guardar
        </button>
      </div>
    </form>
  );
}// =============================================================================
// ACCION — Create + Edit
// =============================================================================

export function CreateAccionForm({
  componentes, disabled, onCancel, onSubmit,
}: {
  componentes: ComponenteFull[];
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <form action={onSubmit} className="grid grid-cols-1 items-end gap-3 md:grid-cols-3">
      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Componente</span>
        <select name="idComponente" required defaultValue="" className={INPUT_CLS}>
          <option value="" disabled>Seleccionar…</option>
          {componentes.map((c) => (
            <option key={c.idComponente} value={c.idComponente}>{c.nombre}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Acción</span>
        <select name="nombre" required defaultValue="" className={INPUT_CLS}>
          <option value="" disabled>Seleccionar…</option>
          {ACCIONES_VALIDAS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={disabled} className={BTN_GHOST}>Cancelar</button>
        <button type="submit" disabled={disabled} className={BTN_SECONDARY}>
          {disabled && <Loader2 className="size-4 animate-spin" />}Crear
        </button>
      </div>
    </form>
  );
}

export function EditAccionForm({
  accion, componentes, disabled, onCancel, onSubmit,
}: {
  accion: AccionFull;
  componentes: ComponenteFull[];
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <form action={onSubmit} className="grid grid-cols-1 items-end gap-3 md:grid-cols-3">
      <input type="hidden" name="idAccion" value={accion.idAccion} />
      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Componente</span>
        <select
          name="idComponente"
          required
          defaultValue={accion.idComponente}
          className={INPUT_CLS}
        >
          {componentes.map((c) => (
            <option key={c.idComponente} value={c.idComponente}>{c.nombre}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Acción</span>
        <select name="nombre" required defaultValue={accion.nombre} className={INPUT_CLS}>
          {ACCIONES_VALIDAS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={disabled} className={BTN_GHOST}>Cancelar</button>
        <button type="submit" disabled={disabled} className={BTN_SECONDARY}>
          {disabled && <Loader2 className="size-4 animate-spin" />}Guardar
        </button>
      </div>
    </form>
  );
}