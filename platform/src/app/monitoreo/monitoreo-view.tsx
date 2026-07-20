"use client";

// =============================================================================
// MonitoreoView — orquestador cliente del módulo de monitoreo.
//
// Recibe los datos del server component y arma:
//   - Tabs Tabla/Mapa (cliente, sin navegación).
//   - Filtros sticky arriba (tipo de punto, componente, búsqueda libre).
//   - KPIs en cards arriba del listado.
//   - Tabla de puntos con expansión a ficha (PuntosTable) o mapa (MonitoreoMap).
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Filter, List, MapIcon, Search } from "lucide-react";
import { TIPOS_PUNTO, TIPO_PUNTO_LABEL, TIPO_PUNTO_COLOR } from "@/lib/constants";
import type { TipoPunto, MonitoreoKpis, MonitoreoPunto } from "@/lib/types";
import { PuntosTable } from "./puntos-table";
import { MonitoreoMap } from "./monitoreo-map";

type Filtros = {
  tipo: TipoPunto | null;
  componente: string | null;
  q: string;
};

type Tab = "tabla" | "mapa";

const COMPONENTE_COLOR: Record<string, "primary" | "secondary" | "tertiary"> = {
  C1: "primary",
  C2: "secondary",
  C3: "tertiary",
};

export function MonitoreoView({
  kpis,
  puntos,
  canEdit,
  filtros,
}: {
  kpis: MonitoreoKpis;
  puntos: MonitoreoPunto[];
  canEdit: boolean;
  filtros: Filtros;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("tabla");

  // Estado controlado de los filtros — sincronizamos con la URL al aplicar.
  const [tipo, setTipo] = React.useState<string>(filtros.tipo ?? "");
  const [componente, setComponente] = React.useState<string>(filtros.componente ?? "");
  const [q, setQ] = React.useState<string>(filtros.q);

  // Filtrado local adicional (instantáneo) sobre la lista ya filtrada del
  // server. Permite que la búsqueda tipeada filtre sin recargar la página
  // hasta el momento del "Aplicar".
  const puntosLocalFiltrados = React.useMemo(() => {
    if (!q.trim()) return puntos;
    const term = q.trim().toLowerCase();
    return puntos.filter(
      (p) =>
        p.actividad.toLowerCase().includes(term) ||
        p.nombrePredio.toLowerCase().includes(term) ||
        (p.nombreMunicipio ?? "").toLowerCase().includes(term),
    );
  }, [puntos, q]);

  function aplicarFiltros(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (tipo) params.set("tipo", tipo);
    if (componente) params.set("componente", componente);
    if (q.trim()) params.set("q", q.trim());
    const qs = params.toString();
    router.push(qs ? `/monitoreo?${qs}` : "/monitoreo");
  }

  function limpiarFiltros() {
    setTipo("");
    setComponente("");
    setQ("");
    router.push("/monitoreo");
  }

  const componentesDisponibles = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of puntos) set.add(p.nombreComponente);
    return Array.from(set).sort();
  }, [puntos]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase text-on-surface-variant">
            Total puntos
          </p>
          <p className="mt-1 text-2xl font-bold text-on-surface">
            {kpis.totalPuntos}
          </p>
        </Card>
        {TIPOS_PUNTO.map((t) => (
          <Card key={t} className="p-4">
            <p className="text-[10px] font-bold uppercase text-on-surface-variant">
              {TIPO_PUNTO_LABEL[t]}
            </p>
            <p className={`mt-1 text-2xl font-bold text-${TIPO_PUNTO_COLOR[t]}`}>
              {kpis.porTipo[t] ?? 0}
            </p>
          </Card>
        ))}
      </div>

      {/* Tabs Tabla / Mapa */}
      <div className="flex items-center gap-1 border-b border-outline-variant">
        <button
          onClick={() => setTab("tabla")}
          className={
            "inline-flex items-center gap-2 border-b-2 px-4 py-2 text-label-lg font-bold transition-colors " +
            (tab === "tabla"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface")
          }
        >
          <List className="size-4" />
          Tabla
        </button>
        <button
          onClick={() => setTab("mapa")}
          className={
            "inline-flex items-center gap-2 border-b-2 px-4 py-2 text-label-lg font-bold transition-colors " +
            (tab === "mapa"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface")
          }
        >
          <MapIcon className="size-4" />
          Mapa
        </button>
      </div>

      {/* Filtros sticky */}
      <Card className="sticky top-0 z-10 p-3">
        <form
          onSubmit={aplicarFiltros}
          className="flex flex-col gap-3 md:flex-row md:items-end"
        >
          <label className="block md:w-56">
            <span className="mb-1 block text-[11px] font-bold uppercase text-on-surface-variant">
              Tipo de punto
            </span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Todos</option>
              {TIPOS_PUNTO.map((t) => (
                <option key={t} value={t}>
                  {TIPO_PUNTO_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:w-40">
            <span className="mb-1 block text-[11px] font-bold uppercase text-on-surface-variant">
              Componente
            </span>
            <select
              value={componente}
              onChange={(e) => setComponente(e.target.value)}
              className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Todos</option>
              {componentesDisponibles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block flex-1">
            <span className="mb-1 block text-[11px] font-bold uppercase text-on-surface-variant">
              Búsqueda libre
            </span>
            <div className="relative flex items-center">
              <Search className="absolute left-3 size-4 text-on-surface-variant" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Actividad, predio o municipio…"
                className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-all hover:bg-primary/90"
            >
              <Filter className="size-4" />
              Aplicar
            </button>
            <button
              type="button"
              onClick={limpiarFiltros}
              className="h-10 rounded-lg border border-outline-variant px-4 text-sm font-semibold hover:bg-surface-variant/40"
            >
              Limpiar
            </button>
          </div>
        </form>

        {/* Chips de filtro activos */}
        {(tipo || componente || q.trim()) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tipo && (
              <Badge variant={TIPO_PUNTO_COLOR[tipo as TipoPunto]}>
                {TIPO_PUNTO_LABEL[tipo as TipoPunto]}
              </Badge>
            )}
            {componente && (
              <Badge variant={COMPONENTE_COLOR[componente] ?? "outline"}>
                {componente}
              </Badge>
            )}
            {q.trim() && <Badge variant="outline">“{q.trim()}”</Badge>}
          </div>
        )}
      </Card>

      {/* Contenido por tab */}
      {tab === "tabla" ? (
        <PuntosTable puntos={puntosLocalFiltrados} canEdit={canEdit} />
      ) : (
        <Card className="overflow-hidden p-0">
          <MonitoreoMap puntos={puntosLocalFiltrados.filter((p) => p.lat !== null && p.lon !== null)} />
        </Card>
      )}
    </div>
  );
}
