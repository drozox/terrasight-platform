// =============================================================================
// /predios/nuevo — Alta de predio (HU-TC-01)
// Server Component: requireRole ADMIN|GESTOR + carga de lookups.
// =============================================================================

import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth-guard";
import { listPropietarios, listVeredas } from "@/lib/repos";
import { PredioForm } from "../predio-form";

export const metadata = { title: "Nuevo predio — TerraSight" };

export default async function NuevoPredioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; field?: string }>;
}) {
  await requireRole(["ADMIN", "GESTOR"] as const);
  const [propietarios, veredas] = await Promise.all([
    listPropietarios(),
    listVeredas(),
  ]);
  const sp = await searchParams;
  const initialError = sp?.error ? decodeURIComponent(sp.error) : null;

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
              <p className="font-mono text-[11px] text-on-surface-variant">NUEVO</p>
              <h1 className="text-2xl font-bold text-on-surface">Registrar predio</h1>
              <p className="text-body-sm text-on-surface-variant">
                Completá los datos del nuevo predio. Los campos marcados con *
                son obligatorios. El polígono (geom PostGIS) se puede cargar
                después desde el panel de importación.
              </p>
            </div>
          </div>

          <PredioForm
            mode="create"
            propietarios={propietarios}
            veredas={veredas}
            initialError={initialError}
          />
        </Card>
      </div>
    </div>
  );
}
