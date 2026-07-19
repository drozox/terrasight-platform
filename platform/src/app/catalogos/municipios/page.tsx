// =============================================================================
// /catalogos/municipios — CRUD de municipios (HU-TC-06)
//
// Server Component: requireAdmin + listMunicipiosFull (con contadores de
// veredas/predios linkeados). Pasa la data al client wrapper MunicipiosView.
// =============================================================================

import { Card } from "@/components/ui/card";
import { BookMarked } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guard";
import { listMunicipiosFull } from "@/lib/repository";
import {
  crearMunicipioAction,
  actualizarMunicipioAction,
  eliminarMunicipioAction,
} from "../actions";
import { MunicipiosView } from "./municipios-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Municipios — TerraSight" };

export default async function MunicipiosPage() {
  await requireAdmin();
  const municipios = await listMunicipiosFull();

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-7xl flex-col gap-gutter">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookMarked className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Municipios</h1>
            <p className="text-body-sm text-on-surface-variant">
              {municipios.length} municipios en el modelo BDG
            </p>
          </div>
        </div>
        <Card className="overflow-hidden">
          <MunicipiosView
            municipios={municipios}
            actions={{
              onCreate: crearMunicipioAction,
              onUpdate: actualizarMunicipioAction,
              onDelete: eliminarMunicipioAction,
            }}
          />
        </Card>
      </div>
    </div>
  );
}
