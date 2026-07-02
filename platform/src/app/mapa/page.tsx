import { LeafletMap } from "@/components/map/leaflet-map";
import { MapLegend } from "@/components/map/map-legend";
import {
  getPrediosMini,
  getQuebradasMini,
  getPrediosGeoJSON,
  getComponentes,
} from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const [predios, quebradas, geojson, componentes] = await Promise.all([
    getPrediosMini(),
    getQuebradasMini(),
    getPrediosGeoJSON(),
    getComponentes(),
  ]);

  // Top 3 predios para mostrar en el panel lateral
  const topPredios = geojson.features.slice(0, 5);

  return (
    <div className="relative flex h-full flex-1 overflow-hidden bg-surface-container-low">
      <div className="relative flex-1">
        <LeafletMap
          predios={predios}
          quebradas={quebradas}
          geojson={geojson}
          showLayersPanel
        />

        {/* Leyenda flotante */}
        <MapLegend componentes={componentes} />

        {/* Mini panel de resumen */}
        <div className="absolute bottom-4 left-4 z-[600] rounded-xl border border-outline-variant/40 bg-surface-container-lowest/95 p-4 shadow-xl backdrop-blur">
          <h3 className="mb-3 text-label-lg font-bold uppercase text-on-surface-variant">
            Resumen territorial
          </h3>
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-bold leading-none text-primary">
                {predios.length}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase text-on-surface-variant">
                Predios
              </p>
            </div>
            <div className="border-l border-outline-variant pl-6">
              <p className="text-2xl font-bold leading-none text-secondary">
                {quebradas.length}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase text-on-surface-variant">
                Quebradas
              </p>
            </div>
            <div className="border-l border-outline-variant pl-6">
              <p className="text-2xl font-bold leading-none text-tertiary">
                {componentes.length}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase text-on-surface-variant">
                Componentes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel lateral de predios destacados */}
      <aside className="hidden w-80 flex-shrink-0 overflow-y-auto border-l border-outline-variant bg-surface p-gutter lg:block">
        <h2 className="mb-3 text-title-lg font-bold text-on-surface">
          Predios destacados
        </h2>
        <p className="mb-4 text-body-sm text-on-surface-variant">
          Top 5 predios del Convenio CAR — WWF — Fundación Natura.
        </p>
        <ul className="space-y-2">
          {topPredios.map((f) => (
            <li
              key={f.properties.id}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-on-surface">
                    {f.properties.nombre}
                  </p>
                  <p className="font-mono text-[10px] text-on-surface-variant">
                    {f.properties.codigo}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {f.properties.componente}
                </span>
              </div>
              <p className="mt-2 text-body-sm text-on-surface-variant">
                {f.properties.areaHa.toLocaleString("es-CO", {
                  maximumFractionDigits: 1,
                })}{" "}
                ha
              </p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}