"use client";

// =============================================================================
// FiltroTerritorial — filtros por MUNICIPIO / VEREDA / PREDIO (dependientes).
// Al cambiar, actualiza la URL (?municipio&vereda&predio) preservando el filtro
// de componente/acción; el server re-renderiza mapa e indicadores.
// =============================================================================

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, FilterX } from "lucide-react";

export type MunOption = { idMunicipio: number; nombre: string };
export type VerOption = { idVereda: number; nombre: string; idMunicipio: number };
export type PreOption = { idPredio: number; nombrePredio: string; idVereda: number };

export function FiltroTerritorial({
  municipios,
  veredas,
  predios,
  municipio,
  vereda,
  predio,
}: {
  municipios: MunOption[];
  veredas: VerOption[];
  predios: PreOption[];
  municipio: string | null;
  vereda: string | null;
  predio: string | null;
}) {
  const router = useRouter();
  const search = useSearchParams();

  function push(next: { municipio?: string | null; vereda?: string | null; predio?: string | null }) {
    const p = new URLSearchParams(search?.toString() ?? "");
    for (const k of ["municipio", "vereda", "predio"]) p.delete(k);
    if (next.municipio) p.set("municipio", next.municipio);
    if (next.vereda) p.set("vereda", next.vereda);
    if (next.predio) p.set("predio", next.predio);
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  const veredasFiltradas = municipio
    ? veredas.filter((v) => String(v.idMunicipio) === municipio)
    : [];
  const prediosFiltrados = vereda
    ? predios.filter((p) => String(p.idVereda) === vereda)
    : [];

  const hayFiltro = !!(municipio || vereda || predio);

  const selectCls =
    "h-10 w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-3 pr-9 text-body-sm font-bold text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest px-gutter py-md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-label-lg font-bold text-on-surface">Filtros territoriales</h2>
        {hayFiltro && (
          <button
            type="button"
            onClick={() => push({})}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-primary/10"
          >
            <FilterX className="size-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-on-surface-variant">Municipio</span>
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

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-on-surface-variant">Vereda</span>
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

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-on-surface-variant">Predio</span>
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
      </div>
    </div>
  );
}
