// =============================================================================
// /intervenciones/nueva — Alta de intervención/propuesta (DEEPSEEK-F2.2)
//
// Server Component: valida rol, carga catálogos (acciones, predios) y delega
// al form client. El shape específico (punto/línea/polígono) se gestiona vía
// la herramienta de dibujo del mapa (TODO: integrar Leaflet.draw cuando esté
// disponible). Por ahora, esta página crea el registro en sgs_pro_propuesta
// con tipo + acción + actividad, y redirige a la ficha donde el equipo puede
// asociar geometría vía SQL/admin.
// =============================================================================

import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth-guard";
import { listAccionesFull, listPredios } from "@/lib/repos";
import { NuevaIntervencionForm } from "./nueva-intervencion-form";

export const metadata = { title: "Nueva intervención — SIG TERRITORIO" };

export default async function NuevaIntervencionPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; error?: string }>;
}) {
  await requireRole(["ADMIN", "GESTOR"] as const);
  const [acciones, predios, sp] = await Promise.all([
    listAccionesFull(),
    listPredios(),
    searchParams,
  ]);
  const initialTipo =
    sp?.tipo === "punto" || sp?.tipo === "linea" || sp?.tipo === "poligono"
      ? sp.tipo
      : null;
  const initialError = sp?.error ? decodeURIComponent(sp.error) : null;

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
          <div className="mb-4 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <Wrench className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">
                Nueva intervención
              </h1>
              <p className="text-body-sm text-on-surface-variant">
                Crear una propuesta o intervención nueva. La geometría
                específica (punto, línea o polígono) se asocia después en
                la ficha.
              </p>
            </div>
          </div>

          <NuevaIntervencionForm
            acciones={acciones.map((a) => ({
              idAccion: a.idAccion,
              nombre: a.nombre,
              nombreComponente: a.nombreComponente,
            }))}
            predios={predios.map((p) => ({
              idPredio: p.idPredio,
              nombrePredio: p.nombrePredio,
            }))}
            initialTipo={initialTipo}
            initialError={initialError}
          />
        </Card>
      </div>
    </div>
  );
}
