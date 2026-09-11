import { ComponentRibbon } from "@/components/dashboard/component-ribbon";
import { ImportPanel } from "@/components/dashboard/import-panel";
import { SummaryBar } from "@/components/dashboard/bottom-sections";
import {
  getDashboardKpis,
  getComponentes,
  getIntervencionesRecientes,
  getFooterKpis,
  getPropuestasPorComponente,
  pingDb,
} from "@/lib/repos";
import { DashboardContent } from "./dashboard-suspense";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ componente?: string; q?: string }>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const componenteFiltro = params.componente ?? null;
  const queryTexto = params.q ?? "";
  const esImportar = componenteFiltro === "IMPORT";

  // Modo "Importar capa": reemplazamos el cuerpo por el ImportPanel.
  if (esImportar) {
    // Datos ligeros solo para el ribbon + footer
    const [componentes, footer] = await Promise.all([
      getComponentes(),
      getFooterKpis(),
    ]);
    return (
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <div className="border-b border-outline-variant bg-surface-container-lowest px-gutter py-3">
          <ComponentRibbon active="IMPORT" />
        </div>
        <div className="flex flex-1 overflow-y-auto bg-surface-container-low p-gutter">
          <div className="mx-auto w-full max-w-5xl">
            <ImportPanel />
          </div>
        </div>
        <SummaryBar footer={footer} />
      </div>
    );
  }

  // =======================================================================
  // DEBT-3.9 + Sprint 23 hotfix: Layout con streaming SSR.
  //
  // Antes: 13 queries en Promise.all bloqueaban TODO el SSR. Si el GIST index
  // tardaba, el navegador veía pantalla en blanco.
  //
  // Ahora: el home carga en paralelo SOLO los datos que necesita para el shell
  // inicial (kpis, componentes, footer, intervenciones, series, dbHealth).
  // Las queries pesadas del mapa (prediosGeoJSON, quebradasMini) y del right
  // panel (alertas) se cargan dentro de sub-componentes envueltos en
  // <Suspense> — se streamean en cuanto estén listos, sin bloquear el resto.
  //
  // Resultado: el usuario ve header + ribbon + KPI cards en <300ms; el mapa
  // y los paneles laterales aparecen progresivamente.
  // =======================================================================

  const [
    kpis,
    componentes,
    intervenciones,
    footerInicial,
    seriesComponentes,
    dbHealth,
  ] = await Promise.all([
    getDashboardKpis(),
    getComponentes(),
    getIntervencionesRecientes(8, componenteFiltro),
    getFooterKpis(),
    getPropuestasPorComponente(),
    pingDb(),
  ]);

  return (
    <DashboardContent
      componenteFiltro={componenteFiltro}
      queryTexto={queryTexto}
      kpis={kpis}
      componentes={componentes}
      footerInicial={footerInicial}
      intervenciones={intervenciones}
      seriesComponentes={seriesComponentes}
      dbHealth={dbHealth}
    />
  );
}
