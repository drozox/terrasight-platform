// =============================================================================
// /catalogos/microcuencas — CRUD de microcuencas (HU-TC-09)
//
// Server Component: requireAdmin + listMicrocuencasFull (con contador de
// quebradas). Sin FKs (microcuenca es la entidad raiz de su grupo).
// =============================================================================

import { Card } from "@/components/ui/card";
import { BookMarked } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guard";
import { listMicrocuencasFull } from "@/lib/repos";
import {
  crearMicrocuencaAction,
  actualizarMicrocuencaAction,
  eliminarMicrocuencaAction,
} from "../actions";
import { MicrocuencasView } from "./microcuencas-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Microcuencas — TerraSight" };

export default async function MicrocuencasPage() {
  await requireAdmin();
  const microcuencas = await listMicrocuencasFull();

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-7xl flex-col gap-gutter">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookMarked className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Microcuencas</h1>
            <p className="text-body-sm text-on-surface-variant">
              {microcuencas.length} microcuenca(s) en el modelo BDG
            </p>
          </div>
        </div>
        <Card className="overflow-hidden">
          <MicrocuencasView
            microcuencas={microcuencas}
            actions={{
              onCreate: crearMicrocuencaAction,
              onUpdate: actualizarMicrocuencaAction,
              onDelete: eliminarMicrocuencaAction,
            }}
          />
        </Card>
      </div>
    </div>
  );
}
