// =============================================================================
// Sub-componentes del dashboard `/` con Suspense boundaries para streaming.
// Reforma INICIO: saludo, filtros territoriales, barra de comandos de paneles,
// sin búsqueda en el mapa ni monitor de intervenciones.
// =============================================================================

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { ComponentRibbon } from "@/components/dashboard/component-ribbon";
import { CoberturaChart } from "@/components/dashboard/cobertura-chart";
import { SummaryBar } from "@/components/dashboard/bottom-sections";
import { MetasStrip } from "@/components/dashboard/metas-strip";
import { ComparativaComponentes } from "@/components/dashboard/comparativa-componentes";
import { AlertasMetas } from "@/components/dashboard/alertas-metas";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { PanelToggles, PanelGate } from "@/components/dashboard/panel-toggles";
import {
  FiltroTerritorial,
  type MunOption,
  type VerOption,
  type PreOption,
} from "@/components/dashboard/filtro-territorial";
import { LeafletMap } from "@/components/map/leaflet-map";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import type { AccionCode } from "@/lib/acciones";
import {
  getPrediosMini,
  getQuebradasMini,
  getPrediosGeoJSON,
  getPrediosPorMunicipio,
} from "@/lib/repos";
import type { AvanceComponente, ComponenteKey, ResumenComponente } from "@/lib/repos";
import type {
  DashboardKpis,
  ComponenteTotal,
  FooterKpis,
  SerieTemporal,
  PredioMini,
  CoberturaTotal,
} from "@/lib/types";
import { formatInt } from "@/lib/utils";
import type { FeatureCollection as GeoJSONFeatureCollection } from "geojson";

export type TerritorioFiltro = {
  municipio: string | null;
  vereda: string | null;
  predio: string | null;
};

// RightPanel (Recharts) cargado client-side.
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

function toTerritorioNum(t: TerritorioFiltro) {
  const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null);
  return { municipio: num(t.municipio), vereda: num(t.vereda), predio: num(t.predio) };
}

/** Map + health pill. Carga predios, quebradas y geojson (con filtro territorial). */
async function MapSection({
  componenteFiltro,
  accionFiltro,
  territorio,
  dbHealth,
}: {
  componenteFiltro: string | null;
  accionFiltro: AccionCode | null;
  territorio: TerritorioFiltro;
  dbHealth: { ok: boolean; latencyMs: number; server?: string };
}) {
  const terr = toTerritorioNum(territorio);
  const [predios, quebradas, geojson] = await Promise.all([
    getPrediosMini(componenteFiltro, accionFiltro, terr),
    getQuebradasMini(),
    getPrediosGeoJSON(componenteFiltro, accionFiltro, terr),
  ]);

  return (
    <div className="relative h-[440px] w-full flex-shrink-0 overflow-hidden rounded-xl border border-outline-variant bg-surface-variant shadow-sm lg:min-h-[600px] lg:flex-1">
      <LeafletMap
        predios={predios}
        quebradas={quebradas}
        geojson={geojson as unknown as GeoJSONFeatureCollection}
        activeComponente={componenteFiltro}
        activeAccion={accionFiltro}
        height="100%"
      />

      <div className="absolute bottom-4 left-4 z-[600] rounded-full bg-surface-container-lowest/95 px-3 py-1.5 text-[11px] shadow-md backdrop-blur">
        <span
          className="mr-1 inline-block size-2 rounded-full align-middle"
          style={{ background: dbHealth.ok ? "var(--color-success)" : "var(--color-error)" }}
        />
        {dbHealth.ok
          ? `PostGIS OK · ${dbHealth.latencyMs} ms · ${dbHealth.server ?? ""}`
          : `Postgres sin conexión (${dbHealth.latencyMs} ms)`}
      </div>

      <div className="absolute bottom-3 left-1/2 z-[500] -translate-x-1/2 rounded-md bg-surface-container-lowest/80 px-2 py-1 text-[10px] text-on-surface-variant shadow-sm backdrop-blur">
        Zoom 3–22 · wheel / double-click / +/–
      </div>
    </div>
  );
}

/** Top municipios por predios. */
async function TopMunicipiosSection({ resumen }: { resumen?: ResumenComponente }) {
  const topMunicipios = await getPrediosPorMunicipio(6);
  const muniSource = resumen?.topMunicipios?.length
    ? resumen.topMunicipios.map((m) => ({ nombre_municipio: m.nombre, predios: m.propuestas }))
    : topMunicipios;
  const total = muniSource.reduce((a, m) => a + m.predios, 0) || 1;
  const items: CoberturaTotal[] = muniSource.map((m, i) => ({
    nombre: m.nombre_municipio,
    area: m.predios,
    porcentaje: Math.round((m.predios / total) * 100),
    color: i === 0 ? "primary" : i === 1 ? "secondary" : i === 2 ? "tertiary" : "outline",
  }));
  return (
    <div className="grid grid-cols-1 gap-gutter">
      <CoberturaChart
        title="Top Municipios por Predios"
        items={items}
        totalValue={formatInt(total)}
        totalLabel="predios"
      />
    </div>
  );
}

async function RightPanelSection({
  kpis,
  componentes,
  footer,
  seriesComponentes,
  resumen,
  componenteFiltro,
  accionFiltro,
}: {
  kpis: DashboardKpis;
  componentes: ComponenteTotal[];
  footer: FooterKpis;
  seriesComponentes: Record<"C1" | "C2" | "C3", SerieTemporal[]>;
  resumen?: ResumenComponente;
  componenteFiltro: string | null;
  accionFiltro: AccionCode | null;
}) {
  return (
    <RightPanel
      kpis={kpis}
      componentes={componentes}
      footer={footer}
      seriesComponentes={seriesComponentes}
      resumen={resumen}
      metasSlot={
        <PanelGate id="metas">
          <MetasStrip componente={componenteFiltro} accion={accionFiltro} />
        </PanelGate>
      }
    />
  );
}

export function DashboardContent({
  componenteFiltro,
  accionFiltro,
  territorio,
  opcionesTerritorio,
  usuarioNombre,
  kpis,
  componentes,
  footerInicial,
  seriesComponentes,
  dbHealth,
  avances,
  resumen,
}: {
  componenteFiltro: string | null;
  accionFiltro: AccionCode | null;
  territorio: TerritorioFiltro;
  opcionesTerritorio: { municipios: MunOption[]; veredas: VerOption[]; predios: PreOption[] };
  usuarioNombre: string;
  kpis: DashboardKpis;
  componentes: ComponenteTotal[];
  footerInicial: FooterKpis;
  seriesComponentes: Record<"C1" | "C2" | "C3", SerieTemporal[]>;
  dbHealth: { ok: boolean; latencyMs: number; server?: string };
  avances: Record<ComponenteKey, AvanceComponente>;
  resumen: ResumenComponente;
}) {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="border-b border-outline-variant bg-surface-container-lowest px-gutter py-md">
        <ComponentRibbon active={componenteFiltro} avances={avances} activeAccion={accionFiltro} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex flex-1 flex-col gap-gutter overflow-y-auto bg-surface-container-low p-gutter">
          <WelcomeBanner nombre={usuarioNombre} />

          <PanelToggles />

          <FiltroTerritorial
            municipios={opcionesTerritorio.municipios}
            veredas={opcionesTerritorio.veredas}
            predios={opcionesTerritorio.predios}
            municipio={territorio.municipio}
            vereda={territorio.vereda}
            predio={territorio.predio}
          />

          <PanelGate id="atencion">
            <AlertasMetas indicadores={resumen.indicadores} />
          </PanelGate>

          <ComparativaComponentes componentes={componentes} avances={avances} />

          <Suspense
            fallback={
              <div className="relative flex h-[440px] w-full flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-outline-variant bg-surface-variant shadow-sm lg:min-h-[600px] lg:flex-1">
                <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                  <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm">Cargando mapa y predios…</p>
                </div>
              </div>
            }
          >
            <MapSection
              componenteFiltro={componenteFiltro}
              accionFiltro={accionFiltro}
              territorio={territorio}
              dbHealth={dbHealth}
            />
          </Suspense>

          <Suspense
            fallback={
              <Card className="h-56 w-full">
                <Skeleton className="h-full w-full rounded-lg" />
              </Card>
            }
          >
            <TopMunicipiosSection resumen={resumen} />
          </Suspense>
        </div>

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
            footer={footerInicial}
            seriesComponentes={seriesComponentes}
            resumen={resumen}
            componenteFiltro={componenteFiltro}
            accionFiltro={accionFiltro}
          />
        </Suspense>
      </div>

      <PanelGate id="franja">
        <SummaryBar footer={footerInicial} resumen={resumen} />
      </PanelGate>
    </div>
  );
}

export type { PredioMini };
