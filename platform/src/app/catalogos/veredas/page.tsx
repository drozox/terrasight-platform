// =============================================================================
// /catalogos/veredas — CRUD de veredas (HU-TC-07)
//
// Server Component: requireAdmin + listVeredasFull (con contador de predios).
// Tambien carga listMunicipios (mini) para popular el <select> de FK
// idMunicipio en create/edit.
// =============================================================================

import { Card } from "@/components/ui/card";
import { BookMarked } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guard";
import { listVeredasFull, listMunicipios } from "@/lib/repos";
import {
  crearVeredaAction,
  actualizarVeredaAction,
  eliminarVeredaAction,
} from "../actions";
import { VeredasView } from "./veredas-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Veredas — SIG TERRITORIO" };

export default async function VeredasPage() {
  await requireAdmin();
  const [veredas, municipios] = await Promise.all([
    listVeredasFull(),
    listMunicipios(),
  ]);

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-7xl flex-col gap-gutter">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookMarked className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Veredas</h1>
            <p className="text-body-sm text-on-surface-variant">
              {veredas.length} veredas en el modelo BDG
            </p>
          </div>
        </div>
        <Card className="overflow-hidden">
          <VeredasView
            veredas={veredas}
            municipios={municipios}
            actions={{
              onCreate: crearVeredaAction,
              onUpdate: actualizarVeredaAction,
              onDelete: eliminarVeredaAction,
            }}
          />
        </Card>
      </div>
    </div>
  );
}
