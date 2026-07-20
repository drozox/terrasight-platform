"use client";

// =============================================================================
// Form de análisis buffer (HU-AA-02). Submit = GET a search params para que la
// página (Server) corra el análisis y muestre resultados.
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PropuestaSimple, QuebradaFull, BufferTarget } from "@/lib/types";

type Initial = {
  tipo: string;
  id: string;
  distancia: string;
};

const RANGO_PRESETS: Array<{ label: string; valor: number }> = [
  { label: "100 m",   valor: 100 },
  { label: "500 m",   valor: 500 },
  { label: "1 km",    valor: 1000 },
  { label: "5 km",    valor: 5000 },
];

export function BufferForm({
  quebradas,
  propuestas,
  initial,
}: {
  quebradas: QuebradaFull[];
  propuestas: PropuestaSimple[];
  initial: Initial;
}) {
  const router = useRouter();
  const [tipo, setTipo] = React.useState<BufferTarget>(
    (initial.tipo === "quebrada" || initial.tipo === "propuesta" ? initial.tipo : "quebrada") as BufferTarget,
  );
  const [id, setId] = React.useState(initial.id);
  const [distancia, setDistancia] = React.useState(initial.distancia || "500");
  const [busy, setBusy] = React.useState(false);

  // Opciones del select secundario según tipo
  const targetOptions = tipo === "quebrada"
    ? quebradas.map((q) => ({ value: String(q.idQuebrada), label: `#${q.idQuebrada} — ${q.nombreQuebrada}` }))
    : propuestas.map((p) => ({
        value: String(p.idPropuesta),
        label: `#${p.idPropuesta} · ${p.tipo} — ${p.actividad || "(sin descripción)"}${p.hectareas != null ? ` · ${p.hectareas.toFixed(2)} ha` : ""}${p.longitudM != null ? ` · ${p.longitudM.toFixed(0)} m` : ""}`,
      }));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    const params = new URLSearchParams();
    params.set("btipo", tipo);
    params.set("bid", id);
    params.set("bdistancia", distancia);
    router.push(`/analisis?${params.toString()}#buffer`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-12">
      <label className="md:col-span-3 block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Origen</span>
        <select
          value={tipo}
          onChange={(e) => { setTipo(e.target.value as BufferTarget); setId(""); }}
          className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="quebrada">Quebrada</option>
          <option value="propuesta">Propuesta</option>
        </select>
      </label>

      <label className="md:col-span-6 block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Entidad específica</span>
        <select
          value={id}
          onChange={(e) => setId(e.target.value)}
          required
          className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="" disabled>Seleccionar…</option>
          {targetOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="md:col-span-2 block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Distancia (m)</span>
        <Input
          name="distancia"
          type="number"
          min={1}
          max={50000}
          step="10"
          value={distancia}
          onChange={(e) => setDistancia(e.target.value)}
          required
        />
      </label>

      <div className="md:col-span-1 flex items-end">
        <Button type="submit" disabled={busy || !id} className="w-full">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
          Analizar
        </Button>
      </div>

      <div className="md:col-span-12 flex flex-wrap gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">Atajos:</span>
        {RANGO_PRESETS.map((p) => (
          <button
            key={p.valor}
            type="button"
            onClick={() => setDistancia(String(p.valor))}
            className="rounded-full border border-outline-variant px-2.5 py-0.5 text-[11px] font-bold text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
          >
            {p.label}
          </button>
        ))}
      </div>
    </form>
  );
}
