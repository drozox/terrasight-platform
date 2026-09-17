// =============================================================================
// Dashboard INICIO — layout reorganizado (Less density. More hierarchy).
// Orden: Header → Componentes → Bienvenida → Filtros → Segmentado de paneles
//        → Requiere atención → Grid (mapa 70% + panel derecho 30%)
//        → Comparativa → Indicadores inferiores → Footer.
// =============================================================================

import { Suspense } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { ComponentRibbon } from "@/components/dashboard/component-ribbon";
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
import type { AccionCode } from "@/lib/acciones";
import {
  getPrediosMini,
  getQuebradasMini,
  getPrediosGeoJSON,
} from "@/lib/repos";
import type { AvanceComponente, ComponenteKey, ResumenComponente } from "@/lib/repos";
import type {
  DashboardKpis,
  ComponenteTotal,
  FooterKpis,
  PredioMini,
} from "@/lib/types";
import type { FeatureCollection as GeoJSONFeatureCollection } from "geojson";

export type TerritorioFiltro = {
  municipio: string | null;
  vereda: string | null;
  predio: string | null;
};

const RightPanel = dynamic(
  () => import("@/components/dashboard/right-panel").then((m) => m.RightPanel),
  {
    loading: () => (
      <div className="flex w-full flex-col gap-6 rounded-[20px] border border-outline-variant bg-surface p-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    ),
  },
);

function toTerritorioNum(t: TerritorioFiltro) {
  const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null);
  return { municipio: num(t.municipio), vereda: num(t.vereda), predio: num(t.predio) };
}

/** Mapa (protagonista) + health pill. */
async function MapSection({
  componenteFiltro,
  accionFiltro,
  territorio,
  focusTerritorio,
  dbHealth,
}: {
  componenteFiltro: string | null;
  accionFiltro: AccionCode | null;
  territorio: TerritorioFiltro;
  focusTerritorio: boolean;
  dbHealth: { ok: boolean; latencyMs: number; server?: string };
}) {
  const terr = toTerritorioNum(territorio);
  const [predios, quebradas, geojson] = await Promise.all([
    getPrediosMini(componenteFiltro, accionFiltro, terr),
    getQuebradasMini(),
    getPrediosGeoJSON(componenteFiltro, accionFiltro, terr),
  ]);

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-[24px] border border-outline-variant bg-surface-variant shadow-[0_2px_16px_rgba(0,0,0,0.05)] lg:h-full lg:min-h-[660px]">
      <LeafletMap
        predios={predios}
        quebradas={quebradas}
        geojson={geojson as unknown as GeoJSONFeatureCollection}
        activeComponente={componenteFiltro}
        activeAccion={accionFiltro}
        territorio={terr}
        focusTerritorio={focusTerritorio}
        height="100%"
      />

      <div className="absolute bottom-6 left-6 z-[600] rounded-full bg-surface-container-lowest/95 px-4 py-2 text-[12px] shadow-md backdrop-blur">
        <span
          className="mr-1.5 inline-block size-2 rounded-full align-middle"
          style={{ background: dbHealth.ok ? "var(--color-success)" : "var(--color-error)" }}
        />
        {dbHealth.ok
          ? `PostGIS OK · ${dbHealth.latencyMs} ms · ${dbHealth.server ?? ""}`
          : `Postgres sin conexión (${dbHealth.latencyMs} ms)`}
      </div>

      <div className="absolute bottom-5 left-1/2 z-[500] -translate-x-1/2 rounded-md bg-surface-container-lowest/80 px-3 py-1 text-[11px] text-on-surface-variant shadow-sm backdrop-blur">
        Zoom 3–22 · wheel / double-click / +/–
      </div>
    </div>
  );
}

async function RightPanelSection({
  kpis,
  footer,
  resumen,
  componenteFiltro,
  accionFiltro,
  filtrosSlot,
  comparativaSlot,
  atencionSlot,
}: {
  kpis: DashboardKpis;
  footer: FooterKpis;
  resumen?: ResumenComponente;
  componenteFiltro: string | null;
  accionFiltro: AccionCode | null;
  filtrosSlot?: ReactNode;
  comparativaSlot?: ReactNode;
  atencionSlot?: ReactNode;
}) {
  return (
    <RightPanel
      kpis={kpis}
      footer={footer}
      resumen={resumen}
      filtrosSlot={filtrosSlot}
      comparativaSlot={comparativaSlot}
      atencionSlot={atencionSlot}
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
  focusTerritorio,
  kpis,
  componentes,
  footerInicial,
  dbHealth,
  avances,
  resumen,
}: {
  componenteFiltro: string | null;
  accionFiltro: AccionCode | null;
  territorio: TerritorioFiltro;
  opcionesTerritorio: { municipios: MunOption[]; veredas: VerOption[]; predios: PreOption[] };
  usuarioNombre: string;
  focusTerritorio: boolean;
  kpis: DashboardKpis;
  componentes: ComponenteTotal[];
  footerInicial: FooterKpis;
  dbHealth: { ok: boolean; latencyMs: number; server?: string };
  avances: Record<ComponenteKey, AvanceComponente>;
  resumen: ResumenComponente;
}) {
  return (
    <div className="flex h-full flex-1 overflow-hidden">
      {/* Contenido */}
      <div className="flex-1 overflow-y-auto bg-surface-container-low">
        <div className="mx-auto w-full max-w-[1600px] px-8 py-8">
          {/* 1. Componentes */}
          <ComponentRibbon active={componenteFiltro} activeAccion={accionFiltro} />

          {/* 2. Bienvenida */}
          <div className="mt-8">
            <WelcomeBanner nombre={usuarioNombre} />
          </div>

          {/* 3. Grid principal: mapa + comparativa | panel derecho con todos los paneles */}
          <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-8">
              <Suspense
                fallback={
                  <div className="relative flex h-[520px] w-full items-center justify-center overflow-hidden rounded-[24px] border border-outline-variant bg-surface-variant shadow-sm lg:min-h-[660px]">
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
                  focusTerritorio={focusTerritorio}
                  dbHealth={dbHealth}
                />
              </Suspense>
            </div>

            <div className="flex flex-col gap-6 xl:items-end">
              <Suspense
                fallback={
                  <div className="flex w-full flex-col gap-6 rounded-[20px] border border-outline-variant bg-surface p-6">
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-52 w-full rounded-xl" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                  </div>
                }
              >
                <RightPanelSection
                  kpis={kpis}
                  footer={footerInicial}
                  resumen={resumen}
                  componenteFiltro={componenteFiltro}
                  accionFiltro={accionFiltro}
                  filtrosSlot={
                    <PanelGate id="filtros">
                      <FiltroTerritorial
                        municipios={opcionesTerritorio.municipios}
                        veredas={opcionesTerritorio.veredas}
                        predios={opcionesTerritorio.predios}
                        municipio={territorio.municipio}
                        vereda={territorio.vereda}
                        predio={territorio.predio}
                      />
                    </PanelGate>
                  }
                  comparativaSlot={
                    <PanelGate id="comparativa">
                      <ComparativaComponentes componentes={componentes} avances={avances} />
                    </PanelGate>
                  }
                  atencionSlot={
                    <PanelGate id="atencion">
                      <AlertasMetas indicadores={resumen.indicadores} />
                    </PanelGate>
                  }
                />
              </Suspense>

              {/* Barra de paneles (íconos) — abajo del panel derecho, al borde. */}
              <PanelToggles />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { PredioMini };
