"use client";

// =============================================================================
// Form compartido: alta + edición de predios.
// Una sola fuente de verdad para los inputs (DRY).
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PredioFull, PropietarioMini, VeredaMini } from "@/lib/repository";
import {
  crearPredioAction,
  actualizarPredioAction,
  eliminarPredioAction,
} from "./actions";

type Mode = "create" | "edit";

const FIELD_DEFS = [
  { name: "nombrePredio",      label: "Nombre del predio",          type: "string",  min: 2, max: 255, required: true },
  { name: "cedulaCatastral",   label: "Cédula catastral",           type: "string",  required: true },
  { name: "cedulaAnt",         label: "Cédula anterior",            type: "string",  required: true },
  { name: "nucleoPredial",     label: "Núcleo predial",             type: "string",  required: true },
  { name: "areaHa",            label: "Área (ha)",                  type: "number",  required: true, step: "0.01", min: 0 },
  { name: "longitudCentroide", label: "Longitud centroide (lon)",   type: "number",  required: true, step: "0.000001", min: -180, max: 180 },
  { name: "latitudCentroide",  label: "Latitud centroide (lat)",    type: "number",  required: true, step: "0.000001", min: -90,  max: 90 },
  { name: "perimetro",         label: "Perímetro (m, opcional)",    type: "number",  required: false, step: "0.01", min: 0 },
] as const;

function Field({
  label, error, children, hint,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-label-lg font-medium text-on-surface">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-error">{error}</span>}
      {!error && hint && <span className="mt-1 block text-[11px] text-on-surface-variant">{hint}</span>}
    </label>
  );
}

export function PredioForm({
  mode,
  initial,
  propietarios,
  veredas,
  initialError,
}: {
  mode: Mode;
  initial?: PredioFull;
  propietarios: PropietarioMini[];
  veredas: VeredaMini[];
  initialError?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initialError ?? null);
  const [flash, setFlash] = React.useState<{ tipo: "ok" | "error"; msg: string } | null>(null);

  function showFlash(f: { tipo: "ok" | "error"; msg: string }) {
    setFlash(f);
    if (f.tipo === "ok") setTimeout(() => setFlash(null), 3500);
  }

  async function onSubmitCreate(fd: FormData) {
    setBusy(true); setError(null);
    const res = await crearPredioAction(fd);
    setBusy(false);
    if (res.ok) {
      showFlash({ tipo: "ok", msg: res.message });
      if (res.idPredio) router.push(`/predios/${res.idPredio}`);
    } else {
      setError(res.message);
    }
  }

  async function onSubmitEdit(fd: FormData) {
    setBusy(true); setError(null);
    const res = await actualizarPredioAction(fd);
    setBusy(false);
    if (res.ok) {
      showFlash({ tipo: "ok", msg: res.message });
      setTimeout(() => router.refresh(), 600);
    } else {
      setError(res.message);
    }
  }

  async function onDelete() {
    if (!initial) return;
    if (!confirm(`¿Eliminar el predio "${initial.nombrePredio}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.set("idPredio", String(initial.idPredio));
    const res = await eliminarPredioAction(fd);
    setBusy(false);
    if (res.ok) {
      router.push("/predios");
    } else {
      setError(res.message);
    }
  }

  // Compatibilidad de los números: si initial.longitudCentroide == 0 y no fue
  // setado, ponemos como placeholder el centro de Cundinamarca para no obligar.
  const lonPlaceholder = -73.85;
  const latPlaceholder = 4.65;

  return (
    <form
      action={mode === "create" ? onSubmitCreate : onSubmitEdit}
      className="space-y-4"
    >
      {flash && (
        <div
          role="status"
          className={
            flash.tipo === "ok"
              ? "flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-body-sm text-primary"
              : "flex items-start gap-2 rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error"
          }
        >
          {flash.tipo === "ok" ? <CheckCircle2 className="mt-0.5 size-4 flex-shrink-0" /> : <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />}
          <span>{flash.msg}</span>
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
          <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {mode === "edit" && initial && (
        <input type="hidden" name="idPredio" value={initial.idPredio} />
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {FIELD_DEFS.map((f) => {
          const v = initial ? (initial as unknown as Record<string, unknown>)[f.name] : undefined;
          const isNum = f.type === "number";
          return (
            <Field
              key={f.name}
              label={f.label + (f.required ? "" : " (opcional)")}
            >
              <Input
                name={f.name}
                type={isNum ? "number" : "text"}
                step={isNum ? (f as { step?: string }).step ?? "1" : undefined}
                min={isNum ? (f as { min?: number }).min : undefined}
                max={isNum ? (f as { max?: number }).max : undefined}
                required={f.required}
                defaultValue={v !== undefined && v !== null && v !== "" ? String(v) : ""}
                placeholder={
                  !v &&
                  f.name === "longitudCentroide" ? String(lonPlaceholder) :
                  !v &&
                  f.name === "latitudCentroide"  ? String(latPlaceholder) :
                  undefined
                }
              />
            </Field>
          );
        })}

        <Field label="Propietario">
          <select
            name="idPropietario"
            required
            defaultValue={initial?.idPropietario ?? ""}
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="" disabled>Seleccionar propietario</option>
            {propietarios.map((p) => (
              <option key={p.idPropietario} value={p.idPropietario}>
                {p.nombreRazonSocial}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Vereda">
          <select
            name="idVereda"
            required
            defaultValue={initial?.idVereda ?? ""}
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="" disabled>Seleccionar vereda</option>
            {veredas.map((v) => (
              <option key={v.idVereda} value={v.idVereda}>
                {v.nombreVereda} — {v.nombreMunicipio}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Observaciones" hint="Texto libre, máx 2000 caracteres. Aparecerá en la ficha del predio.">
          <textarea
            name="observaciones"
            maxLength={2000}
            defaultValue={initial?.observaciones ?? ""}
            rows={3}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant pt-4">
        {mode === "edit" && (
          <Button type="button" variant="danger" onClick={onDelete} disabled={busy}>
            Eliminar
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/predios")}
          disabled={busy}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {mode === "create" ? "Crear predio" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
