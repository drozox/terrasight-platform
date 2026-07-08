// =============================================================================
// /catalogos — Gestion de catalogos del modelo BDG (HU-TC-03)
//
// Server Component: solo ADMIN. Carga componentes y acciones en paralelo y
// delega a una sola vista cliente que muestra dos tablas lado a lado con
// edicion inline y delete confirmado.
// =============================================================================

import { Card } from "@/components/ui/card";
import { BookMarked, AlertTriangle } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guard";
import {
  listComponentesFull,
  listAccionesFull,
  COMPONENTES_VALIDOS,
  ACCIONES_VALIDAS,
} from "@/lib/repository";
import { CatalogosTable } from "./catalogos-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catálogos — TerraSight" };

export default async function CatalogosPage() {
  await requireAdmin();
  const [componentes, acciones] = await Promise.all([
    listComponentesFull(),
    listAccionesFull(),
  ]);

  // Derivados utiles para el header
  const totalPropuestasEnAcciones = acciones.reduce(
    (acc, a) => acc + a.totalPropuestas,
    0,
  );

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-7xl flex-col gap-gutter">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tertiary/10 text-tertiary">
              <BookMarked className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">Catálogos</h1>
              <p className="text-body-sm text-on-surface-variant">
                {componentes.length} componentes · {acciones.length} acciones ·{" "}
                {totalPropuestasEnAcciones} propuesta(s) vinculadas en total.
              </p>
            </div>
          </div>
        </div>

        {/* Aviso de modelo cerrado */}
        <Card className="border-l-4 border-l-tertiary bg-tertiary/5 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 flex-shrink-0 text-tertiary" />
            <div className="text-body-sm text-on-surface">
              <p className="font-semibold">Catálogo cerrado del modelo BDG</p>
              <p className="mt-0.5 text-on-surface-variant">
                Los nombres válidos están restringidos por el modelo:{" "}
                <span className="font-mono font-semibold text-on-surface">
                  {COMPONENTES_VALIDOS.join(", ")}
                </span>{" "}
                para componentes y{" "}
                <span className="font-mono font-semibold text-on-surface">
                  {ACCIONES_VALIDAS.join(", ")}
                </span>{" "}
                para acciones. Cualquier cambio impacta todos los reportes, las
                propuestas y los dashboards del convenio. Usar con precaución.
              </p>
            </div>
          </div>
        </Card>

        {/* Tablas CRUD */}
        <CatalogosTable
          componentes={componentes}
          acciones={acciones}
        />

        <p className="text-center text-[11px] text-on-surface-variant">
          Solo ADMIN puede modificar catálogos. Las propuestas y reportes
          derivados se actualizan automáticamente al guardar cambios.
        </p>
      </div>
    </div>
  );
}