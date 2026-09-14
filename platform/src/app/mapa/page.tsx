import { LeafletMap } from "@/components/map/leaflet-map";
import { MapLegend } from "@/components/map/map-legend";
import { getPrediosMini, getQuebradasMini, getComponentes } from "@/lib/repos";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const [predios, quebradas, componentes] = await Promise.all([
    getPrediosMini(),
    getQuebradasMini(),
    getComponentes(),
  ]);

  return (
    <div className="relative flex h-full flex-1 overflow-hidden bg-surface-container-low">
      <div className="relative flex-1">
        <LeafletMap
          predios={predios}
          quebradas={quebradas}
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
    </div>
  );
}
