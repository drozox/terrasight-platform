// =============================================================================
// Página /admin/importaciones/[id] — detalle de una importación + errores
// =============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth-guard";
import { getImportacion } from "@/lib/repos/importaciones";

export const metadata = { title: "Detalle de importación — SIG TERRITORIO" };
export const dynamic = "force-dynamic";

export default async function ImportacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) notFound();

  const { importacion, errors } = await getImportacion(idNum);
  if (!importacion) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Link
        href="/admin/importaciones"
        className="inline-flex items-center gap-2 text-label-lg font-bold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        Volver a Importaciones
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-on-surface">
          Importación #{importacion.id_importacion}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          <span className="font-mono">{importacion.nombre_archivo}</span>
          {" · "}
          {new Date(importacion.created_at).toLocaleString("es-CO")}
          {" · por "}
          {importacion.usuario}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={importacion.total_filas} />
        <Stat label="Exitosas" value={importacion.filas_exitosas} className="text-emerald-700" />
        <Stat label="Con error" value={importacion.filas_con_error} className="text-red-700" />
        <Stat label="Estado" value={importacion.estado} />
      </section>

      {importacion.comentario && (
        <p className="rounded bg-surface-container p-3 text-sm">
          <strong>Comentario:</strong> {importacion.comentario}
        </p>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-on-surface">
          <AlertTriangle className="size-5" aria-hidden="true" />
          Errores de validación ({errors.length})
        </h2>
        {errors.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 text-sm text-on-surface-variant">
            Sin errores. ¡Importación limpia!
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
            <table className="w-full text-sm">
              <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
                <tr>
                  <th className="px-3 py-2">Fila</th>
                  <th className="px-3 py-2">Columna</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Mensaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {errors.map((e) => (
                  <tr key={e.id_error} className="hover:bg-surface-container/40">
                    <td className="px-3 py-2 font-mono">{e.fila}</td>
                    <td className="px-3 py-2 font-mono text-xs">{e.columna ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{e.valor ?? "—"}</td>
                    <td className="px-3 py-2 text-red-700">{e.mensaje}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number | string; className?: string }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className={`mt-0.5 text-xl font-bold font-mono ${className ?? "text-on-surface"}`}>{value}</p>
    </div>
  );
}
