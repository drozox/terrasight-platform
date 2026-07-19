"use client";

// =============================================================================
// GenericForm — Sub-componente de CatalogoGenerico (HU-TC-06..10).
// Renderiza el formulario inline para CREATE o EDIT. Es data-driven:
//   - fields: declaracion de campos (text/number/enum/select)
//   - initial: defaultValues (vacio para create, fila para edit)
//   - pkName: nombre del PK (oculto si initial[pkName] esta presente)
// =============================================================================

import * as React from "react";
import { Loader2 } from "lucide-react";
import type { FieldDef } from "./catalogo-generico";

const INPUT_CLS =
  "h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm " +
  "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const BTN_PRIMARY =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary " +
  "transition-all hover:bg-primary/90 disabled:opacity-50";

const BTN_GHOST =
  "h-9 rounded-lg border border-outline-variant px-4 text-sm font-semibold hover:bg-surface-variant/40 " +
  "disabled:opacity-50";

function parseDefaultValue(value: unknown, type: FieldDef<never>["type"]): string {
  if (value === null || value === undefined) return "";
  if (type === "number") return String(value);
  return String(value);
}

export function GenericForm<T extends { createdAt: Date | null; updatedAt: Date | null }>({
  fields,
  pkName,
  initial,
  submitLabel,
  disabled,
  onCancel,
  onSubmit,
}: {
  fields: FieldDef<T>[];
  pkName: keyof T;
  initial: Partial<T>;
  submitLabel: string;
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  const pkValue = initial[pkName];
  return (
    <form
      action={onSubmit}
      className="grid grid-cols-1 items-end gap-3 md:grid-cols-3"
    >
      {pkValue !== undefined && (
        <input type="hidden" name={String(pkName)} value={String(pkValue)} />
      )}
      {fields.map((f) => {
        const v = initial[f.name];
        const isSelect = f.type === "select" || f.type === "enum";
        const choices = f.options ?? (f.values?.map((x) => ({ value: x, label: x })) ?? []);
        return (
          <label key={String(f.name)} className="block">
            <span className="mb-1 block text-label-lg font-medium text-on-surface">
              {f.label}
              {f.required && <span className="ml-1 text-error">*</span>}
            </span>
            {isSelect ? (
              <select
                name={String(f.name)}
                required={f.required}
                defaultValue={parseDefaultValue(v, f.type)}
                className={INPUT_CLS}
              >
                {!f.required && <option value="">— Ninguno —</option>}
                {choices.map((opt) => {
                  const o = typeof opt === "string" ? { value: opt, label: opt } : opt;
                  return (
                    <option key={String(o.value)} value={String(o.value)}>
                      {o.label}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                name={String(f.name)}
                type={f.type === "number" ? "number" : "text"}
                required={f.required}
                min={f.min}
                max={f.max}
                defaultValue={parseDefaultValue(v, f.type)}
                placeholder={f.placeholder}
                className={INPUT_CLS}
              />
            )}
            {f.hint && (
              <span className="mt-1 block text-[11px] text-on-surface-variant">
                {f.hint}
              </span>
            )}
          </label>
        );
      })}
      <div className="md:col-span-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={disabled} className={BTN_GHOST}>
          Cancelar
        </button>
        <button type="submit" disabled={disabled} className={BTN_PRIMARY}>
          {disabled && <Loader2 className="size-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
