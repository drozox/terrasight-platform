"use client";

// =============================================================================
// FiltroTerritorial — card de filtros: MUNICIPIO / VEREDA / PREDIO (dependientes)
// + COMPONENTE / ACCIÓN. Actualiza la URL y el server re-renderiza mapa e
// indicadores. Botón "Limpiar filtros" separado.
// =============================================================================

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, FilterX, Search } from "lucide-react";
import { type AccionCode } from "@/lib/acciones";

export type MunOption = { idMunicipio: number; nombre: string };
export type VerOption = { idVereda: number; nombre: string; idMunicipio: number };
export type PreOption = { idPredio: number; nombrePredio: string; idVereda: number };

const COMPONENTES = ["C1", "C2", "C3"] as const;
const ACCIONES_POR: Record<string, AccionCode[]> = {
  C1: ["C1A1", "C1A2"],
  C2: ["C2A1", "C2A2"],
  C3: ["C3AU"],
};

const selectCls =
  "h-11 w-full appearance-none rounded-xl border border-outline-variant bg-surface-container-lowest px-4 pr-10 text-[14px] font-medium text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60";

export function FiltroTerritorial({
  municipios,
  veredas,
  predios,
  municipio,
  vereda,
  predio,
  componente,
  accion,
}: {
  municipios: MunOption[];
  veredas: VerOption[];
  predios: PreOption[];
  municipio: string | null;
  vereda: string | null;
  predio: string | null;
  componente: string | null;
  accion: AccionCode | null;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);

  function push(next: {
    municipio?: string | null;
    vereda?: string | null;
    predio?: string | null;
    componente?: string | null;
    accion?: string | null;
    focus?: string | null;
  }) {
    const p = new URLSearchParams(search?.toString() ?? "");
    for (const k of ["municipio", "vereda", "predio", "componente", "accion", "focus"]) p.delete(k);
    const put = (k: string, v?: string | null) => {
      if (v) p.set(k, v);
    };
    put("municipio", next.municipio);
    put("vereda", next.vereda);
    put("predio", next.predio);
    put("componente", next.componente);
    put("accion", next.accion);
    put("focus", next.focus);
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function onBuscar() {
    if (!municipio && !vereda && !predio) {
      setError("Seleccioná al menos municipio, vereda o predio para buscar.");
      return;
    }
    setError(null);
    push({ municipio, vereda, predio, componente, accion, focus: "1" });
  }

  const veredasFiltradas = municipio ? veredas.filter((v) => String(v.idMunicipio) === municipio) : [];
  const prediosFiltrados = vereda ? predios.filter((p) => String(p.idVereda) === vereda) : [];
  const accionesDisponibles = componente ? ACCIONES_POR[componente] ?? [] : [];

  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-on-surface">Filtros territoriales</h2>
          <p className="mt-1 text-[13px] text-on-surface-variant">
            Elegí municipio, vereda y/o predio y presioná <strong>Buscar</strong> para acercar el mapa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBuscar}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Search className="size-4" />
            Buscar
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              push({});
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-outline-variant px-4 text-[13px] font-semibold text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <FilterX className="size-4" />
            Limpiar
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-on-surface-variant">Municipio</span>
          <div className="relative">
            <select
              value={municipio ?? ""}
              onChange={(e) => push({ municipio: e.target.value || null })}
              className={selectCls}
            >
              <option value="">Todos</option>
              {municipios.map((m) => (
                <option key={m.idMunicipio} value={m.idMunicipio}>{m.nombre}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-on-surface-variant">Vereda</span>
          <div className="relative">
            <select
              value={vereda ?? ""}
              disabled={!municipio}
              onChange={(e) => push({ municipio, vereda: e.target.value || null })}
              className={selectCls}
            >
              <option value="">Todas</option>
              {veredasFiltradas.map((v) => (
                <option key={v.idVereda} value={v.idVereda}>{v.nombre}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-on-surface-variant">Predio</span>
          <div className="relative">
            <select
              value={predio ?? ""}
              disabled={!vereda}
              onChange={(e) => push({ municipio, vereda, predio: e.target.value || null })}
              className={selectCls}
            >
              <option value="">Todos</option>
              {prediosFiltrados.map((p) => (
                <option key={p.idPredio} value={p.idPredio}>{p.nombrePredio}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-on-surface-variant">Componente</span>
          <div className="relative">
            <select
              value={componente ?? ""}
              onChange={(e) =>
                push({
                  municipio,
                  vereda,
                  predio,
                  componente: e.target.value || null,
                  accion: null,
                })
              }
              className={selectCls}
            >
              <option value="">Todos</option>
              {COMPONENTES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-on-surface-variant">Acción</span>
          <div className="relative">
            <select
              value={accion ?? ""}
              disabled={!componente}
              onChange={(e) =>
                push({ municipio, vereda, predio, componente, accion: e.target.value || null })
              }
              className={selectCls}
            >
              <option value="">Todas</option>
              {accionesDisponibles.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
          </div>
        </label>
      </div>

      {error && <p className="mt-4 text-[13px] font-medium text-error">{error}</p>}
    </section>
  );
}
