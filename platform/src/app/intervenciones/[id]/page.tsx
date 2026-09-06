// =============================================================================
// /intervenciones/[id] — Ficha de intervención (HU-IC-01..04).
// Server Component que carga la propuesta completa y delega a la vista
// interactiva. Mismo patrón que /predios/[id].
// =============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth-guard";
import { getIntervencionCompleta } from "@/lib/repos";
import { IntervencionDetail } from "./intervencion-detail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Intervención — SIG TERRITORIO" };

export default async function IntervencionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) notFound();

  const intervencion = await getIntervencionCompleta(idNum);
  if (!intervencion) notFound();

  // Permiso: ADMIN o GESTOR pueden editar. ANALISTA queda read-only.
  const canEdit = user.rol === "ADMIN" || user.rol === "GESTOR";

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-5xl flex-col gap-gutter">
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
            <div className="flex-1">
              <p className="font-mono text-[11px] text-on-surface-variant">
                PR-{String(intervencion.predio?.id ?? 0).padStart(5, "0")}
                {" · "}
                {intervencion.accion?.componente ?? "—"}
                {" · "}
                {intervencion.accion?.nombre ?? "—"}
              </p>
              <h1 className="text-2xl font-bold text-on-surface">
                Intervención #{intervencion.id} —{" "}
                {intervencion.actividad || intervencion.tipo}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{intervencion.tipo}</Badge>
                {intervencion.accion?.componente && (
                  <Badge variant="primary">
                    {intervencion.accion.componente}
                  </Badge>
                )}
                {intervencion.accion?.nombre && (
                  <Badge variant="outline">{intervencion.accion.nombre}</Badge>
                )}
                {canEdit ? (
                  <span className="text-[11px] text-on-surface-variant">
                    Tu rol ({user.rol}) permite editar.
                  </span>
                ) : (
                  <span className="text-[11px] text-on-surface-variant">
                    Modo lectura — edición reservada a ADMIN y GESTOR.
                  </span>
                )}
              </div>
            </div>
          </div>

          <IntervencionDetail initial={intervencion} canEdit={canEdit} />
        </Card>
      </div>
    </div>
  );
}
