// =============================================================================
// Página /admin/importaciones — UI de importación masiva desde CSV (HU-AD-06)
//
// Solo ADMIN/GESTOR. Muestra:
//  - Historial de importaciones (últimas 50)
//  - Form para subir un CSV de predios
//
// Sprint 21 (P1 del plan v1.0). MVP: solo predios. KML/Excel/Propuestas en
// sprints futuros.
// =============================================================================

import { Upload, FileText, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth-guard";
import { listImportaciones } from "@/lib/repos/importaciones";
import { ImportPrediosForm } from "./import-form";

export const metadata = { title: "Importaciones — SIG TERRITORIO" };
export const dynamic = "force-dynamic";

const ESTADO_STYLES = {
  EN_PROCESO:             { icon: Clock,         className: "bg-blue-100 text-blue-800",   label: "En proceso" },
  COMPLETADO:             { icon: CheckCircle2,  className: "bg-emerald-100 text-emerald-800", label: "Completado" },
  COMPLETADO_CON_ERRORES: { icon: AlertTriangle, className: "bg-amber-100 text-amber-800",  label: "Con errores" },
  FALLIDO:                { icon: XCircle,       className: "bg-red-100 text-red-800",      label: "Fallido" },
} as const;

export default async function ImportacionesPage() {
  const user = await requireUser();
  const canImport = user.rol === "ADMIN" || user.rol === "GESTOR";
  const historial = await listImportaciones(50);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-on-surface">Importaciones masivas</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Carga predios y otras entidades desde CSV. Sprint 21: solo predios.
        </p>
      </header>

      {canImport ? (
        <ImportPrediosForm />
      ) : (
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 text-sm text-on-surface-variant">
          Tu rol ({user.rol}) no permite importar. Solo ADMIN y GESTOR.
        </div>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-on-surface">
          <FileText className="size-5" aria-hidden="true" />
          Historial
        </h2>
        {historial.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 text-sm text-on-surface-variant">
            Sin importaciones aún.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
            <table className="w-full text-sm">
              <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Archivo</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">OK</th>
                  <th className="px-3 py-2 text-right">Error</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {historial.map((h) => {
                  const style = ESTADO_STYLES[h.estado] ?? ESTADO_STYLES.EN_PROCESO;
                  const Icon = style.icon;
                  return (
                    <tr key={h.id_importacion} className="hover:bg-surface-container/40">
                      <td className="px-3 py-2 text-xs text-on-surface-variant">
                        {new Date(h.created_at).toLocaleString("es-CO")}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{h.nombre_archivo}</td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                          {h.tipo_entidad}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{h.total_filas}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-700">{h.filas_exitosas}</td>
                      <td className="px-3 py-2 text-right font-mono text-red-700">{h.filas_con_error}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.className}`}
                        >
                          <Icon className="size-3" aria-hidden="true" />
                          {style.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-on-surface-variant">{h.usuario}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
