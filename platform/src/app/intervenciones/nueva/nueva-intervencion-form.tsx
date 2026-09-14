"use client";

// =============================================================================
// NuevaIntervencionForm — DEEPSEEK-F2.2
// Form client con selector de tipo (punto/línea/polígono) + campos.
// La creación se hace via server action (`guardarNuevaIntervencion`) y al
// terminar redirige a /intervenciones/[id] para que el equipo agregue la
// geometría específica.
// =============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Circle,
  Slash,
  Hexagon,
  MapPin,
  Loader2,
  Save,
} from "lucide-react";

type AccionMini = { idAccion: number; nombre: string; nombreComponente: string };
type PredioMini = { idPredio: number; nombrePredio: string };

const TIPOS = [
  { key: "punto", label: "Punto", icon: Circle, desc: "Obras puntuales: cosecha de agua, compostaje, estación, etc." },
  { key: "linea", label: "Línea", icon: Slash, desc: "Líneas: cercos vivos, aislamientos, conectividad." },
  { key: "poligono", label: "Polígono", icon: Hexagon, desc: "Áreas: silvopastoriles, agroforestales, restauración." },
] as const;

export function NuevaIntervencionForm({
  acciones,
  predios,
  initialTipo,
  initialError,
}: {
  acciones: AccionMini[];
  predios: PredioMini[];
  initialTipo: string | null;
  initialError: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<string>(initialTipo ?? "");
  const [idAccion, setIdAccion] = useState<string>("");
  const [idPredio, setIdPredio] = useState<string>("");
  const [actividad, setActividad] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");
  const [error, setError] = useState<string | null>(initialError);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!tipo) return setError("Selecciona el tipo de intervención.");
    if (!idAccion) return setError("Selecciona la acción (CxAy).");
    if (!actividad.trim()) return setError("Indica la actividad.");

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("tipo", tipo);
        fd.set("idAccion", idAccion);
        fd.set("idPredio", idPredio);
        fd.set("actividad", actividad);
        fd.set("observaciones", observaciones);
        const r = await fetch("/api/intervenciones/nueva", {
          method: "POST",
          body: fd,
        });
        const data = (await r.json()) as { ok?: boolean; id?: number; error?: string };
        if (!r.ok || !data.ok) {
          setError(data.error ?? `Error ${r.status}`);
          return;
        }
        router.push(`/intervenciones/${data.id}`);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Selector de tipo */}
      <fieldset>
        <legend className="mb-2 text-label-lg font-bold text-on-surface">
          Tipo de intervención
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TIPOS.map((t) => {
            const Icon = t.icon;
            const active = tipo === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTipo(t.key)}
                aria-pressed={active}
                className={`flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant bg-surface-container-lowest hover:border-primary/50"
                }`}
              >
                <Icon
                  className={`size-6 ${
                    active ? "text-primary" : "text-on-surface-variant"
                  }`}
                />
                <span className="text-label-lg font-bold">{t.label}</span>
                <span className="text-body-sm text-on-surface-variant">
                  {t.desc}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Acción */}
      <div>
        <label
          htmlFor="idAccion"
          className="mb-1 block text-label-lg font-bold text-on-surface"
        >
          Acción (CxAy)
        </label>
        <select
          id="idAccion"
          name="idAccion"
          value={idAccion}
          onChange={(e) => setIdAccion(e.target.value)}
          required
          className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
        >
          <option value="">— Selecciona acción —</option>
          {acciones.map((a) => (
            <option key={a.idAccion} value={a.idAccion}>
              {a.nombreComponente}{a.nombre} ({a.nombreComponente} — Acción {a.nombre})
            </option>
          ))}
        </select>
      </div>

      {/* Predio (opcional) */}
      <div>
        <label
          htmlFor="idPredio"
          className="mb-1 block text-label-lg font-bold text-on-surface"
        >
          Predio (opcional)
        </label>
        <select
          id="idPredio"
          name="idPredio"
          value={idPredio}
          onChange={(e) => setIdPredio(e.target.value)}
          className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
        >
          <option value="">— Sin predio asociado —</option>
          {predios.map((p) => (
            <option key={p.idPredio} value={p.idPredio}>
              {p.nombrePredio}
            </option>
          ))}
        </select>
      </div>

      {/* Actividad */}
      <div>
        <label
          htmlFor="actividad"
          className="mb-1 block text-label-lg font-bold text-on-surface"
        >
          Actividad
        </label>
        <input
          id="actividad"
          name="actividad"
          type="text"
          value={actividad}
          onChange={(e) => setActividad(e.target.value)}
          required
          placeholder="Ej. Cerco vivo multiestrato"
          className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
        />
      </div>

      {/* Observaciones */}
      <div>
        <label
          htmlFor="observaciones"
          className="mb-1 block text-label-lg font-bold text-on-surface"
        >
          Observaciones
        </label>
        <textarea
          id="observaciones"
          name="observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          placeholder="Notas para el equipo…"
          className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
        />
      </div>

      {/* Aviso de geometría */}
      <Card className="border-dashed bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          Después de crear el registro, en la ficha de la intervención podrás
          asociar la geometría específica (punto/línea/polígono) vía SQL o el
          módulo admin. La herramienta de dibujo en el mapa es la siguiente
          iteración.
        </p>
      </Card>

      {error && (
        <p className="rounded-md border border-error/40 bg-error/10 p-3 text-body-sm text-error">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-outline-variant pt-4">
        <Link href="/intervenciones">
          <Button variant="ghost" type="button">
            Cancelar
          </Button>
        </Link>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {isPending ? "Guardando…" : "Crear intervención"}
        </Button>
      </div>
    </form>
  );
}
