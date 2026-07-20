// =============================================================================
// /predios/[id] — Ficha del predio.
// Server Component que carga y delega a la vista interactiva.
// =============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth-guard";
import {
  getPredioById,
  getPrediosGeoJSON,
  listPropietarios,
  listVeredas,
} from "@/lib/repos";
import { PredioDetail } from "./predio-detail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Predio — TerraSight" };

export default async function PredioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) notFound();

  const [predio, geojson, propietarios, veredas] = await Promise.all([
    getPredioById(idNum),
    getPrediosGeoJSON(),
    listPropietarios(),
    listVeredas(),
  ]);
  if (!predio) notFound();

  const feature = geojson.features.find((f) => f.properties.id === idNum) ?? null;

  // Permiso: ADMIN o GESTOR pueden editar; ANALISTA queda read-only.
  const canEdit = user.rol === "ADMIN" || user.rol === "GESTOR";

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
          <div className="mb-4 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </div>
            <div>
              <p className="font-mono text-[11px] text-on-surface-variant">
                {feature?.properties.codigo ?? `PR-${String(idNum).padStart(5, "0")}`}
              </p>
              <h1 className="text-2xl font-bold text-on-surface">
                {predio.nombrePredio}
              </h1>
              {canEdit ? (
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  Tu rol ({user.rol}) permite editar este registro.
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  Modo lectura — edición reservada a ADMIN y GESTOR.
                </p>
              )}
            </div>
          </div>

          <PredioDetail
            initial={predio}
            featureResumen={feature}
            canEdit={canEdit}
            propietarios={propietarios}
            veredas={veredas}
          />
        </Card>
      </div>
    </div>
  );
}
