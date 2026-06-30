import { FooterKpiBar } from "@/components/layout/footer-kpi-bar";
import { ComponentRibbon } from "@/components/dashboard/component-ribbon";
import { KpiSidebar } from "@/components/dashboard/kpi-sidebar";
import { IntervencionesTable } from "@/components/dashboard/intervenciones-table";
import { CoberturaChart } from "@/components/dashboard/cobertura-chart";
import { LeafletMap } from "@/components/map/leaflet-map";
import { formatHa, formatInt } from "@/lib/utils";
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
  pingDb,
} from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
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
    dbHealth,
  ] = await Promise.all([
    getDashboardKpis(),
    getComponentes(),
    getCoberturaVegetal(),
    getIntervencionesRecientes(6),
    getPrediosMini(),
    getQuebradasMini(),
    getPrediosGeoJSON(),
    getAlertas(5),
    getFooterKpis(),
    pingDb(),
  ]);

  const footerItems = [
    { label: "Municipios",      value: footer.municipios,            icon: "location_on" },
    { label: "Veredas",         value: footer.veredas,               icon: "explore" },
    { label: "Predios",         value: formatInt(footer.predios),     icon: "handshake" },
    { label: "Hectáreas Intervenidas", value: formatHa(footer.hectareasIntervenidas), icon: "grid_view" },
    { label: "Fuentes Hídricas", value: formatInt(footer.quebradas),  icon: "water" },
  ];

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-surface-container-low p-gutter">
          <ComponentRibbon />

          <div className="relative h-[460px] w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-variant">
            <LeafletMap predios={predios} quebradas={quebradas} geojson={geojson} />

            {/* Search overlay (decorativo) */}
            <div className="pointer-events-none absolute left-4 right-4 top-4 z-[500] flex justify-center">
              <div className="pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-full border border-outline-variant/30 bg-surface-container-lowest px-4 py-2 shadow-xl">
                <span className="material-symbols-outlined text-on-surface-variant">search</span>
                <input
                  className="w-full border-none bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/60"
                  placeholder="Buscar municipio, vereda o predio…"
                />
                <button className="rounded-md bg-surface-container px-3 py-1 text-label-md text-on-surface-variant hover:bg-surface-variant">
                  3D
                </button>
                <button className="material-symbols-outlined text-on-surface-variant hover:text-primary">layers</button>
                <button className="material-symbols-outlined text-on-surface-variant hover:text-primary">bookmark</button>
              </div>
            </div>

            {/* DB health pill */}
            <div className="absolute bottom-4 left-4 z-[500] rounded-full bg-surface-container-lowest/95 px-3 py-1.5 text-[11px] shadow">
              <span className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: dbHealth.ok ? "var(--color-success)" : "var(--color-error)" }} />
              {dbHealth.ok
                ? `PostGIS OK · ${dbHealth.latencyMs} ms · ${dbHealth.server ?? ""}`
                : `Postgres sin conexión (${dbHealth.latencyMs} ms)`}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-gutter xl:grid-cols-12">
            <IntervencionesTable rows={intervenciones} limit={5} />

            <CoberturaChart
              title="Cobertura Vegetal"
              items={cobertura}
              totalValue="62%"
              totalLabel="Cobertura"
            />

            <CoberturaChart
              title="Uso del Suelo"
              items={[
                { nombre: "Conservación",    area: 32, porcentaje: 32, color: "secondary" },
                { nombre: "Agroforestal",    area: 28, porcentaje: 28, color: "primary" },
                { nombre: "Protección Hídrica", area: 22, porcentaje: 22, color: "tertiary" },
                { nombre: "Otros",          area: 18, porcentaje: 18, color: "outline" },
              ]}
              totalValue={formatHa(footer.hectareasIntervenidas)}
              totalLabel="Hectáreas"
            />
          </div>
        </div>

        <KpiSidebar
          kpis={kpis}
          componentes={componentes}
          alertas={alertas}
          footer={footer}
        />
      </div>

      <FooterKpiBar items={footerItems} />
    </div>
  );
}
