import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getPrediosGeoJSON } from "@/lib/repository";

export default async function PredioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idNum = Number(id);

  const geojson = await getPrediosGeoJSON();
  const feature = geojson.features.find((f) => f.properties.id === idNum);

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-3xl flex-col gap-gutter">
        <Link
          href="/predios"
          className="inline-flex w-fit items-center gap-2 text-label-lg font-bold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Volver a Predios
        </Link>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </div>
            <div className="flex-1">
              <p className="font-mono text-[11px] text-on-surface-variant">
                {feature?.properties.codigo ?? `PR-${String(idNum).padStart(5, "0")}`}
              </p>
              <h1 className="text-2xl font-bold text-on-surface">
                {feature?.properties.nombre ?? `Predio #${id}`}
              </h1>
              {feature && (
                <div className="mt-3 grid grid-cols-2 gap-4 text-body-sm sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-on-surface-variant">
                      Área
                    </p>
                    <p className="font-bold text-on-surface">
                      {feature.properties.areaHa.toLocaleString("es-CO", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      ha
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-on-surface-variant">
                      Componente
                    </p>
                    <p className="font-bold text-on-surface">
                      {feature.properties.componente}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-on-surface-variant">
                      Centroide
                    </p>
                    <p className="font-mono text-on-surface">
                      {feature.geometry.coordinates[1].toFixed(4)},{" "}
                      {feature.geometry.coordinates[0].toFixed(4)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-3 text-title-lg font-semibold text-on-surface">
            Próximas funciones
          </h2>
          <ul className="space-y-2 text-body-sm text-on-surface-variant">
            <li>⏳ Visualización del polígono del predio en mapa</li>
            <li>⏳ Propietarios y actores concertados</li>
            <li>⏳ Historial de intervenciones y planes de manejo</li>
            <li>⏳ Carga de documentos legales (resoluciones, contratos)</li>
            <li>⏳ Edición en línea del registro (CRUD)</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}