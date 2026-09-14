import { LeafletMap } from "@/components/map/leaflet-map";
import { getPrediosMini, getQuebradasMini } from "@/lib/repos";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const [predios, quebradas] = await Promise.all([
    getPrediosMini(),
    getQuebradasMini(),
  ]);

  return (
    <div className="relative flex h-full flex-1 overflow-hidden bg-surface-container-low">
      <div className="relative flex-1">
        <LeafletMap predios={predios} quebradas={quebradas} showLayersPanel />
      </div>
    </div>
  );
}
