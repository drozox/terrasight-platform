// =============================================================================
// Página /admin/calidad — métricas de salud de los datos geográficos (HU-AD-05)
//
// Solo ADMIN. Muestra:
//  - Conteos totales por tabla (12 tablas)
//  - Reglas de calidad (12 reglas) con severity (ok/warning/error)
//  - Inventario de índices GIST + GIN trgm
//
// Los datos vienen de getQualityReport() y se cachean 5 minutos.
// =============================================================================

import { ShieldCheck, AlertTriangle, AlertOctagon, Database, ListTree } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guard";
import { getQualityReport } from "@/lib/repos/calidad";
import { unstable_cache } from "next/cache";

export const metadata = { title: "Calidad de datos — SIG TERRITORIO" };

const getCachedQuality = unstable_cache(
  async () => getQualityReport(),
  ["quality-report"],
  { revalidate: 300, tags: ["calidad"] },
);

const SEV_STYLES: Record<string, { icon: React.ComponentType<{ className?: string }>; className: string; label: string }> = {
  ok:       { icon: ShieldCheck,    className: "bg-primary/10 text-primary",                 label: "OK" },
  warning:  { icon: AlertTriangle,  className: "bg-amber-100 text-amber-800",                 label: "Atención" },
  error:    { icon: AlertOctagon,   className: "bg-red-100 text-red-800",                     label: "Crítico" },
};

const SEV_ORDER: Record<string, number> = { error: 0, warning: 1, ok: 2 };

export default async function CalidadPage() {
  await requireAdmin();
  const report = await getCachedQuality();
  const sortedRules = [...report.rules].sort(
    (a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9),
  );
  const okCount = report.rules.filter((r) => r.severity === "ok").length;
  const warnCount = report.rules.filter((r) => r.severity === "warning").length;
  const errCount = report.rules.filter((r) => r.severity === "error").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-on-surface">Calidad de datos</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Métricas de salud de la base de datos geográfica. Generado el{" "}
          {new Date(report.generatedAt).toLocaleString("es-CO")}
        </p>
      </header>

      {/* Resumen de severidad */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs uppercase tracking-wide text-primary">OK</p>
          <p className="mt-1 text-3xl font-bold text-primary">{okCount}</p>
          <p className="text-xs text-on-surface-variant">reglas sin problemas</p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Atención</p>
          <p className="mt-1 text-3xl font-bold text-amber-700">{warnCount}</p>
          <p className="text-xs text-on-surface-variant">reglas con 1-5% afectadas</p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs uppercase tracking-wide text-red-700">Crítico</p>
          <p className="mt-1 text-3xl font-bold text-red-700">{errCount}</p>
          <p className="text-xs text-on-surface-variant">reglas con &gt;5% afectadas</p>
        </div>
      </div>

      {/* Conteos por tabla */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-on-surface">
          <Database className="size-5" aria-hidden="true" />
          Conteos por tabla
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(report.totals).map(([key, n]) => (
            <div
              key={key}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3"
            >
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                {key.replace(/_/g, " ")}
              </p>
              <p className="mt-0.5 text-2xl font-bold text-on-surface font-mono">
                {n.toLocaleString("es-CO")}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Reglas de calidad */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-on-surface">Reglas de calidad</h2>
        <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-3 py-2">Regla</th>
                <th className="px-3 py-2 text-right">Afectados</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Severidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {sortedRules.map((r) => {
                const style = SEV_STYLES[r.severity];
                const Icon = style.icon;
                return (
                  <tr key={r.id} className="hover:bg-surface-container/40">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-on-surface">{r.label}</p>
                      <p className="text-xs text-on-surface-variant">{r.description}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {r.count.toLocaleString("es-CO")}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-on-surface-variant">
                      {r.total.toLocaleString("es-CO")}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.className}`}
                      >
                        <Icon className="size-3" aria-hidden="true" />
                        {r.message}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Índices */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-on-surface">
          <ListTree className="size-5" aria-hidden="true" />
          Índices espaciales y de búsqueda
        </h2>
        <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-3 py-2">Tabla</th>
                <th className="px-3 py-2">Índice</th>
                <th className="px-3 py-2">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {report.indexes.map((idx) => (
                <tr key={idx.name} className="hover:bg-surface-container/40">
                  <td className="px-3 py-2 font-mono text-xs text-on-surface">{idx.table}</td>
                  <td className="px-3 py-2 font-mono text-xs">{idx.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        idx.kind === "gist"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {idx.kind}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-on-surface-variant">
          GIST = índice espacial (acelera ST_Intersects, ST_DWithin, ST_Buffer). GIN trgm = índice
          de búsqueda textual (acelera ILIKE y similarity en /api/search).
        </p>
      </section>
    </div>
  );
}
