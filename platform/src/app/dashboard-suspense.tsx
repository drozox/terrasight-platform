// =============================================================================
// Sub-componentes del dashboard `/` con Suspense boundaries para streaming.
//
// Razón: la home hace 13 queries en Promise.all. Si una sola tarda 2s, TODO
// el SSR espera 2s antes de enviar HTML. Con Suspense boundaries el navegador
// recibe la primera parte del HTML (ribbon, header) inmediatamente y el
// resto se streama cuando está listo.
//
// Cada sub-componente es un async server component que se renderiza dentro
// de un <Suspense>. El cliente (browser) no necesita hacer nada — Next.js
// maneja el streaming transparentemente.
// =============================================================================

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { ComponentRibbon } from "@/components/dashboard/component-ribbon";
import { BottomSections, SummaryBar } from "@/components/dashboard/bottom-sections";
import { LeafletMap } from "@/components/map/leaflet-map";
import { MapSearchBar } from "@/components/map/map-search-bar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCoberturaVegetal,
  getIntervencionesRecientes,
  getPrediosMini,
  getQuebradasMini,
  getPrediosGeoJSON,
  getAlertas,
  getFooterKpis,
  getPrediosPorMunicipio,
  getPropuestasPorComponente,
} from "@/lib/repos";
import type {
  DashboardKpis,
  ComponenteTotal,
  Alerta,
  FooterKpis,
  SerieTemporal,
  PredioMini,
  PredioPorMunicipio,
  IntervencionReciente,
} from "@/lib/types";
import type { FeatureCollection as GeoJSONFeatureCollection } from "geojson";

// =============================================================================
// Cargas lazy de los Client Components pesados (Recharts, etc.)
// =============================================================================

// RightPanel: usa DonutChart + LineChart (Recharts). Se renderiza client-side.
// Lo cargamos async para que el bundle inicial no lo incluya.
const RightPanel = dynamic(
  () => import("@/components/dashboard/right-panel").then((m) => m.RightPanel),
  {
    loading: () => (
      <aside className="hidden w-[360px] flex-shrink-0 flex-col gap-3 overflow-y-auto border-l border-outline-variant bg-surface p-3 lg:flex">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </aside>
    ),
  },
);

// =============================================================================
// Sub-componentes async con Suspense — cada uno hace sus queries en paralelo
// =============================================================================

/** Map + search overlay + health pill. Carga predios, quebradas y geojson. */
async function MapSection({
  componenteFiltro,
  queryTexto,
  dbHealth,
}: {
  componenteFiltro: string | null;
  queryTexto: string;
  dbHealth: { ok: boolean; latencyMs: number; server?: string };
}) {
  const [predios, quebradas, geojson] = await Promise.all([
    getPrediosMini(componenteFiltro),
    getQuebradasMini(),
    getPrediosGeoJSON(componenteFiltro),
  ]);

  return (
    <div className="relative h-[400px] w-full flex-shrink-0 overflow-hidden rounded-xl border border-outline-variant bg-surface-variant shadow-sm lg:min-h-[560px] lg:flex-1">
      <LeafletMap
        predios={predios}
        quebradas={quebradas}
        geojson={geojson as unknown as GeoJSONFeatureCollection}
        activeComponente={componenteFiltro}
        height="100%"
      />

      <MapSearchBar initialQuery={queryTexto} />

      <div className="absolute bottom-4 left-4 z-[600] rounded-full bg-surface-container-lowest/95 px-3 py-1.5 text-[11px] shadow-md backdrop-blur">
        <span
          className="mr-1 inline-block size-2 rounded-full align-middle"
          style={{
            background: dbHealth.ok
              ? "var(--color-success)"
              : "var(--color-error)",
          }}
        />
        {dbHealth.ok
          ? `PostGIS OK · ${dbHealth.latencyMs} ms · ${dbHealth.server ?? ""}`
          : `Postgres sin conexión (${dbHealth.latencyMs} ms)`}
      </div>

      <div className="absolute bottom-3 right-3 z-[500] rounded-md bg-surface-container-lowest/80 px-2 py-1 text-[10px] text-on-surface-variant shadow-sm backdrop-blur">
        Zoom 3–22 · wheel / double-click / +/–
      </div>
    </div>
  );
}

/** Bottom sections (tabla + cards). Carga intervenciones, cobertura, top municipios. */
async function BottomSection({
  intervenciones,
  queryTexto,
}: {
  intervenciones: IntervencionReciente[];
  queryTexto: string;
}) {
  const [cobertura, topMunicipios, footer] = await Promise.all([
    getCoberturaVegetal(),
    getPrediosPorMunicipio(6),
    getFooterKpis(),
  ]);

  const filtradas = queryTexto
    ? intervenciones.filter((i) => {
        const t = queryTexto.toLowerCase();
        return (
          i.nombrePredio?.toLowerCase().includes(t) ||
          i.municipio?.toLowerCase().includes(t) ||
          i.actividad?.toLowerCase().includes(t)
        );
      })
    : intervenciones;

  return (
    <BottomSections
      intervenciones={filtradas}
      cobertura={cobertura}
      topMunicipios={topMunicipios}
      footer={footer}
    />
  );
}

/** Right panel: KPIs + componentes + tendencia + alertas. */
async function RightPanelSection({
  kpis,
  componentes,
  seriesComponentes,
}: {
  kpis: DashboardKpis;
  componentes: ComponenteTotal[];
  seriesComponentes: Record<"C1" | "C2" | "C3", SerieTemporal[]>;
}) {
  const [alertas, footer] = await Promise.all([
    getAlertas(5),
    getFooterKpis(),
  ]);

  return (
    <RightPanel
      kpis={kpis}
      componentes={componentes}
      footer={footer}
      alertas={alertas}
      seriesComponentes={seriesComponentes}
    />
  );
}

// =============================================================================
// Componente público que el home renderiza
// =============================================================================

export function DashboardContent({
  componenteFiltro,
  queryTexto,
  kpis,
  componentes,
  footerInicial,
  intervenciones,
  seriesComponentes,
  dbHealth,
}: {
  componenteFiltro: string | null;
  queryTexto: string;
  kpis: DashboardKpis;
  componentes: ComponenteTotal[];
  footerInicial: FooterKpis;
  intervenciones: IntervencionReciente[];
  seriesComponentes: Record<"C1" | "C2" | "C3", SerieTemporal[]>;
  dbHealth: { ok: boolean; latencyMs: number; server?: string };
}) {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {/* ComponentRibbon — siempre visible, no hace queries */}
      <div className="border-b border-outline-variant bg-surface-container-lowest px-gutter py-2">
        <ComponentRibbon active={componenteFiltro} />
      </div>

      {/* Contenido principal */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Columna izquierda: mapa (Suspense) + bottom sections (Suspense) */}
        <div className="flex flex-1 flex-col gap-gutter overflow-y-auto bg-surface-container-low p-gutter">
          <Suspense
            fallback={
              <div className="relative flex h-[400px] w-full flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-outline-variant bg-surface-variant shadow-sm lg:min-h-[560px] lg:flex-1">
                <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                  <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm">Cargando mapa y predios…</p>
                </div>
              </div>
            }
          >
            <MapSection
              componenteFiltro={componenteFiltro}
              queryTexto={queryTexto}
              dbHealth={dbHealth}
            />
          </Suspense>

          <Suspense
            fallback={
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </div>
            }
          >
            <BottomSection
              intervenciones={intervenciones}
              queryTexto={queryTexto}
            />
          </Suspense>
        </div>

        {/* Right panel: carga lazy del client component + Suspense para datos */}
        <Suspense
          fallback={
            <aside className="hidden w-[360px] flex-shrink-0 flex-col gap-3 overflow-y-auto border-l border-outline-variant bg-surface p-3 lg:flex">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </aside>
          }
        >
          <RightPanelSection
            kpis={kpis}
            componentes={componentes}
            seriesComponentes={seriesComponentes}
          />
        </Suspense>
      </div>

      {/* Footer Summary Bar — usa los datos iniciales del footer */}
      <SummaryBar footer={footerInicial} />
    </div>
  );
}

// Re-export unused type imports to keep them referenced for tooling
export type { PredioMini };
