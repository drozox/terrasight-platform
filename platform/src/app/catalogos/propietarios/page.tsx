// =============================================================================
// /catalogos/propietarios — CRUD de propietarios (HU-TC-08)
//
// Server Component: requireAdmin + listPropietariosFull (con contador de
// predios). Sin FKs (propietario es la entidad raiz de la cadena).
// =============================================================================

import { Card } from "@/components/ui/card";
import { BookMarked } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guard";
import { listPropietariosFull } from "@/lib/repos";
import {
  crearPropietarioAction,
  actualizarPropietarioAction,
  eliminarPropietarioAction,
} from "../actions";
import { PropietariosView } from "./propietarios-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Propietarios — SIG TERRITORIO" };

export default async function PropietariosPage() {
  await requireAdmin();
  const propietarios = await listPropietariosFull();

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-7xl flex-col gap-gutter">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookMarked className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Propietarios</h1>
            <p className="text-body-sm text-on-surface-variant">
              {propietarios.length} propietario(s) registrado(s)
            </p>
          </div>
        </div>
        <Card className="overflow-hidden">
          <PropietariosView
            propietarios={propietarios}
            actions={{
              onCreate: crearPropietarioAction,
              onUpdate: actualizarPropietarioAction,
              onDelete: eliminarPropietarioAction,
            }}
          />
        </Card>
      </div>
    </div>
  );
}
