// =============================================================================
// /catalogos/beneficiarios — CRUD de beneficiarios (HU-TC-10)
//
// Server Component: requireAdmin + listBeneficiariosFull (con contador de
// relaciones a propuesta_punto). El UNIQUE (nombre, telefono) requiere
// telefono no-vacío en create (validado en el repository).
// =============================================================================

import { Card } from "@/components/ui/card";
import { BookMarked } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guard";
import { listBeneficiariosFull } from "@/lib/repos";
import {
  crearBeneficiarioCatalogosAction,
  actualizarBeneficiarioAction,
  eliminarBeneficiarioAction,
} from "../actions";
import { BeneficiariosView } from "./beneficiarios-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Beneficiarios — TerraSight" };

export default async function BeneficiariosPage() {
  await requireAdmin();
  const beneficiarios = await listBeneficiariosFull();

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-7xl flex-col gap-gutter">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookMarked className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Beneficiarios</h1>
            <p className="text-body-sm text-on-surface-variant">
              {beneficiarios.length} beneficiario(s) registrado(s)
            </p>
          </div>
        </div>
        <Card className="overflow-hidden">
          <BeneficiariosView
            beneficiarios={beneficiarios}
            actions={{
              onCreate: crearBeneficiarioCatalogosAction,
              onUpdate: actualizarBeneficiarioAction,
              onDelete: eliminarBeneficiarioAction,
            }}
          />
        </Card>
      </div>
    </div>
  );
}
