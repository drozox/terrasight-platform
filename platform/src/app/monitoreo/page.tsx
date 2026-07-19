// =============================================================================
// /monitoreo — Módulo de monitoreo ambiental (HU-MO-01..03)
//
// Server Component: renderiza el header, carga KPIs + lista de puntos en
// paralelo y delega al orquestador cliente (MonitoreoView) que arma las
// tabs Tabla/Mapa y la ficha de detalle expandible.
//
// Roles: ADMIN, GESTOR, ANALISTA pueden VER.
//        ADMIN, GESTOR pueden EDITAR (ANALISTA queda en modo lectura).
// =============================================================================

import { Activity } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { getMonitoreoKPIs, listMonitoreoPuntos, isTipoPunto } from "@/lib/repository";
import { MonitoreoView } from "./monitoreo-view";
import { formatInt } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Monitoreo — TerraSight" };

type SearchParams = Promise<{
  tipo?: string;
  componente?: string;
  q?: string;
}>;

export default async function MonitoreoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [params, user] = await Promise.all([
    searchParams,
    requireRole(["ADMIN", "GESTOR", "ANALISTA"] as const),
  ]);

  const tipo = params.tipo && isTipoPunto(params.tipo) ? params.tipo : null;
  const componente = params.componente ?? null;
  const q = (params.q ?? "").trim();

  const canEdit = user.rol === "ADMIN" || user.rol === "GESTOR";

  const [kpis, puntos] = await Promise.all([
    getMonitoreoKPIs(),
    listMonitoreoPuntos({ tipo, componente, q: q || null }),
  ]);

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-7xl flex-col gap-gutter">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">Monitoreo</h1>
              <p className="text-body-sm text-on-surface-variant">
                {formatInt(kpis.totalPuntos)} puntos · {formatInt(kpis.totalBeneficiarios)} beneficiarios
              </p>
            </div>
          </div>
        </div>

        {/* Vista cliente con tabs + filtros + tabla/mapa + ficha */}
        <MonitoreoView
          kpis={kpis}
          puntos={puntos}
          canEdit={canEdit}
          filtros={{ tipo, componente, q }}
        />

        <p className="text-center text-[11px] text-on-surface-variant">
          {canEdit
            ? "Edición disponible — modifica atributos del punto y gestiona beneficiarios."
            : "Modo lectura: tu rol no permite editar puntos de monitoreo."}
        </p>
      </div>
    </div>
  );
}
