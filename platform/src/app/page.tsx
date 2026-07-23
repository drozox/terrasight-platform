import { ComponentRibbon } from "@/components/dashboard/component-ribbon";
import { ImportPanel } from "@/components/dashboard/import-panel";
import { RightPanel } from "@/components/dashboard/right-panel";
import { BottomSections, SummaryBar } from "@/components/dashboard/bottom-sections";
import { MapSearchBar } from "@/components/map/map-search-bar";
import { LeafletMap } from "@/components/map/leaflet-map";
import {
  getDashboardKpis,
  getComponentes,
  getCoberturaVegetal,
  getIntervencionesRecientes,
  getPrediosMini,
  getQuebradasMini,
  getPrediosGeoJSON,
  getAlertas,
  getFooterKpis,
  getPrediosPorMunicipio,
  getPropuestasPorComponente,
  pingDb,
} from "@/lib/repos";

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

  const [
    kpis,
    componentes,
    cobertura,
    intervenciones,
    predios,
    quebradas,
    geojson,
    alertas,
    footer,
    topMunicipios,
    seriesComponentes,
    dbHealth,
  ] = await Promise.all([
    getDashboardKpis(),
    getComponentes(),
    getCoberturaVegetal(),
    getIntervencionesRecientes(8, componenteFiltro),
    getPrediosMini(componenteFiltro),
    getQuebradasMini(),
    getPrediosGeoJSON(componenteFiltro),
    getAlertas(5),
    getFooterKpis(),
    getPrediosPorMunicipio(6),
    getPropuestasPorComponente(),
    pingDb(),
  ]);

  // Filtrado adicional en memoria por texto
  const intervencionesFiltradas = queryTexto
    ? intervenciones.filter((i) => {
        const t = queryTexto.toLowerCase();
        return (
          i.nombrePredio?.toLowerCase().includes(t) ||
          i.municipio?.toLowerCase().includes(t) ||
          i.actividad?.toLowerCase().includes(t)
        );
      })
    : intervenciones;

  // Modo "Importar capa": reemplazamos el cuerpo por el ImportPanel.
  if (esImportar) {
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
  // DEBT-3.9 — Layout: el mapa es la pieza principal. Ocupa el área central
  // con altura flexible (flex-1) y un mínimo de 560px. Los paneles de KPIs,
  // componentes y alertas se compactan en una columna lateral derecha
  // (ocultable) y la fila inferior con tabla + cards.
  // =======================================================================
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {/* ComponentRibbon (C1/C2/C3) — siempre visible */}
      <div className="border-b border-outline-variant bg-surface-container-lowest px-gutter py-2">
        <ComponentRibbon active={componenteFiltro} />
      </div>

      {/* Contenido principal: mapa al centro + right panel (ancho) + bottom */}
      <div className="flex flex-1 overflow-hidden">
        {/* Columna izquierda: mapa grande + bottom sections */}
        <div className="flex flex-1 flex-col gap-gutter overflow-y-auto bg-surface-container-low p-gutter">
          {/* Mapa: pieza central grande, ocupa todo el alto disponible */}
          <div className="relative min-h-[560px] flex-1 w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-variant shadow-sm">
            <LeafletMap
              predios={predios}
              quebradas={quebradas}
              geojson={geojson}
              activeComponente={componenteFiltro}
              height="100%"
            />

            {/* Search overlay (debajo del ZoomControl para no interceptar clicks) */}
            <MapSearchBar initialQuery={queryTexto} />

            {/* DB health pill (esquina inferior izquierda) */}
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

            {/* Tip del mapa — esquina inferior derecha, debajo del ZoomControl */}
            <div className="absolute bottom-3 right-3 z-[500] rounded-md bg-surface-container-lowest/80 px-2 py-1 text-[10px] text-on-surface-variant shadow-sm backdrop-blur">
              Zoom 3–22 · wheel / double-click / +/–
            </div>
          </div>

          {/* Fila inferior: tabla + cards (compactos) */}
          <BottomSections
            intervenciones={intervencionesFiltradas}
            cobertura={cobertura}
            topMunicipios={topMunicipios}
            footer={footer}
          />
        </div>

        {/* Right Panel: KPIs + componentes + tendencia + alertas (ancho fijo) */}
        <RightPanel
          kpis={kpis}
          componentes={componentes}
          footer={footer}
          alertas={alertas}
          seriesComponentes={seriesComponentes}
        />
      </div>

      {/* Footer Summary Bar */}
      <SummaryBar footer={footer} />
    </div>
  );
}
