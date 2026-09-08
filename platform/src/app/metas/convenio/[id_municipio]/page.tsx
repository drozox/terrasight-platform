// =============================================================================
// /metas/convenio/[id_municipio] — Drill-down: detalle por municipio
//
// Muestra el aporte del municipio a cada uno de los 10 indicadores de meta
// + lista de veredas con propuestas + distribución por C-A.
// Patrón: server component con params como Promise (Next 15).
// =============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, MapPin, Building2 } from "lucide-react";
import { getDetalleMunicipio } from "@/lib/repos/metas-convenio";
import { withFallback } from "@/lib/repos/_helpers";
import { DEMO_DETALLE_MUNICIPIO } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id_municipio: string }>;
}) {
  const { id_municipio } = await params;
  return { title: `Municipio ${id_municipio} — Metas del convenio — SIG TERRITORIO` };
}

function pct(indicador: { actual: number; meta: number }): { pct: number; className: string; label: string } {
  if (indicador.meta <= 0) return { pct: 0, className: "bg-muted", label: "— sin meta" };
  const p = Math.round((indicador.actual / indicador.meta) * 100);
  let className = "bg-red-500";
  let label = `${p}% — pendiente`;
  if (p >= 100) { className = "bg-emerald-600"; label = `${p}% — cumplida`; }
  else if (p >= 80) { className = "bg-amber-500"; label = `${p}% — cerca`; }
  else if (p >= 50) { className = "bg-amber-500"; label = `${p}% — en curso`; }
  else { className = "bg-red-500"; label = `${p}% — atrasada`; }
  return { pct: p, className, label };
}

function IndicadorCard({ label, actual, meta, unidad, pct: p, className, statusLabel }: {
  label: string;
  actual: number;
  meta: number;
  unidad: string;
  pct: number;
  className: string;
  statusLabel: string;
}) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-on-surface">{label}</span>
        <span className="text-xs text-on-surface-variant">{statusLabel}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-on-surface">{actual.toFixed(meta > 0 ? 2 : 0)}</span>
        <span className="text-sm text-on-surface-variant">/ {meta} {unidad}</span>
      </div>
      {meta > 0 && (
        <div className="mt-3 h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
          <div className={`h-full transition-all ${className}`} style={{ width: `${Math.min(100, p)}%` }} />
        </div>
      )}
    </div>
  );
}

export default async function DetalleMunicipioPage({
  params,
}: {
  params: Promise<{ id_municipio: string }>;
}) {
  const { id_municipio } = await params;
  const idNum = Number(id_municipio);
  if (!Number.isFinite(idNum) || idNum <= 0) notFound();

  const data = await withFallback(
    `detalleMunicipio_${idNum}`,
    async () => getDetalleMunicipio(idNum),
    DEMO_DETALLE_MUNICIPIO,
  );
  if (!data) notFound();

  return <DetalleMunicipioView data={data} />;
}

function DetalleMunicipioView({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getDetalleMunicipio>>>;
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-on-surface-variant">
          <Link href="/metas/convenio" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="size-4" /> Metas del convenio
          </Link>
          <ChevronRight className="size-4" />
          <span className="text-on-surface font-medium">{data.municipio.nombre}</span>
        </nav>

        <header>
          <h1 className="text-3xl font-bold text-on-surface inline-flex items-center gap-2">
            <MapPin className="size-7 text-primary" />
            {data.municipio.nombre}
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Aporte del municipio a las metas del convenio.
          </p>
        </header>

        {/* Aporte por indicador */}
        <section className="rounded-xl border border-outline-variant bg-surface-container p-6">
          <header className="mb-4">
            <h2 className="text-xl font-bold text-on-surface">Aporte del municipio a las metas</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Cada indicador muestra el avance total del municipio vs la meta global del convenio.
            </p>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.indicadores.map((ind) => {
              const p = pct(ind);
              return <IndicadorCard key={ind.label} {...ind} pct={p.pct} className={p.className} statusLabel={p.label} />;
            })}
          </div>
        </section>

        {/* Distribución por C-A + veredas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-outline-variant bg-surface-container p-6">
            <h2 className="text-lg font-bold text-on-surface mb-3">Distribución por Componente/Acción</h2>
            <ul className="divide-y divide-outline-variant">
              {data.propuestas_por_componente.length === 0 && (
                <li className="py-2 text-sm text-on-surface-variant italic">Sin datos</li>
              )}
              {data.propuestas_por_componente.map((ca) => (
                <li key={`${ca.componente}-${ca.accion}`} className="flex items-baseline justify-between py-2">
                  <span className="text-sm text-on-surface">
                    C{ca.componente}A{ca.accion}
                  </span>
                  <span className="text-xs text-on-surface-variant">{ca.n} propuestas</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container p-6">
            <h2 className="text-lg font-bold text-on-surface mb-3 inline-flex items-center gap-2">
              <Building2 className="size-5" /> Veredas ({data.veredas.length})
            </h2>
            <ul className="divide-y divide-outline-variant max-h-96 overflow-y-auto">
              {data.veredas.length === 0 && (
                <li className="py-2 text-sm text-on-surface-variant italic">Sin veredas con propuestas</li>
              )}
              {data.veredas.map((v) => (
                <li key={v.id_vereda} className="flex items-baseline justify-between py-1.5">
                  <span className="text-sm text-on-surface">{v.nombre}</span>
                  <span className="text-xs text-on-surface-variant">{v.num_propuestas} propuestas</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
