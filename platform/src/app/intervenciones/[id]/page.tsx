import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function IntervencionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-3xl flex-col gap-gutter">
        <Link
          href="/intervenciones"
          className="inline-flex w-fit items-center gap-2 text-label-lg font-bold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Volver a Intervenciones
        </Link>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <Wrench className="size-6" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Intervención #{id}
              </p>
              <h1 className="text-2xl font-bold text-on-surface">
                Detalle de intervención
              </h1>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Ficha técnica completa de la propuesta seleccionada. Aquí se
                mostrará información detallada: predio, municipio, componente,
                acción, geometría (línea / polígono / punto), avances, evidencia
                fotográfica y línea de tiempo.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">En desarrollo</Badge>
                <Badge variant="outline">Próxima fase</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-3 text-title-lg font-semibold text-on-surface">
            Roadmap del módulo
          </h2>
          <ul className="space-y-2 text-body-sm text-on-surface-variant">
            <li>✅ Listado general con filtros por componente y municipio</li>
            <li>⏳ Ficha de detalle con geometría en mapa</li>
            <li>⏳ Avance porcentual con histórico</li>
            <li>⏳ Carga de evidencia fotográfica</li>
            <li>⏳ Línea de tiempo de la intervención</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}