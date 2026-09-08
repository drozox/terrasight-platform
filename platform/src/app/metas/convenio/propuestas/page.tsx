// =============================================================================
// /metas/convenio/propuestas — Drill-down: propuestas que componen un indicador
//
// URL: ?indicador=<key> (ej. cercos_vivos, conectividad, cosecha, predios_c3)
// Muestra hasta 100 propuestas del indicador seleccionado con su actividad,
// predio, municipio y la medida (km para líneas, ha para polígonos, sin
// medida para puntos/super).
// =============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, MapPin, ExternalLink } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { INDICADORES_META, getPropuestasPorIndicador, type IndicadorKey } from "@/lib/repos/metas-convenio";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ indicador?: string }>;

const VALID_KEYS = new Set(Object.keys(INDICADORES_META));

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const key = params.indicador;
  if (!key || !VALID_KEYS.has(key)) return { title: "Propuestas — SIG TERRITORIO" };
  const meta = INDICADORES_META[key as IndicadorKey];
  return { title: `${meta.label} — SIG TERRITORIO` };
}

const fmt = (n: number | null, unidad: string) => {
  if (n === null) return "—";
  if (unidad === "km" || unidad === "ha") return `${n.toFixed(3)} ${unidad}`;
  return String(n);
};

export default async function PropuestasIndicadorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const key = params.indicador;
  if (!key || !VALID_KEYS.has(key)) notFound();

  const meta = INDICADORES_META[key as IndicadorKey];
  const propuestas = await getPropuestasPorIndicador(key as IndicadorKey, 100);

  // Calcular suma para el resumen
  const totalMedida =
    meta.kind === "lineas"
      ? propuestas.reduce((s, p) => s + (p.longitud_km ?? 0), 0)
      : meta.kind === "poligonos"
        ? propuestas.reduce((s, p) => s + (p.hectareas ?? 0), 0)
        : propuestas.length;
  const medidaLabel = meta.kind === "lineas" ? "km" : meta.kind === "poligonos" ? "ha" : "obras";

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "Metas del convenio", href: "/metas/convenio" },
            { label: meta.label },
          ]}
        />

        <header>
          <div className="text-xs uppercase tracking-wide text-on-surface-variant mb-1">
            {meta.ca} · {meta.kind === "lineas" ? "Líneas" : meta.kind === "poligonos" ? "Polígonos" : meta.kind === "puntos" ? "Puntos" : "Propuestas (super)"}
          </div>
          <h1 className="text-3xl font-bold text-on-surface">{meta.label}</h1>
          <p className="mt-2 text-on-surface-variant">
            Meta: {meta.meta} {meta.unidad} · Avance mostrado: {totalMedida.toFixed(2)} {medidaLabel} ({propuestas.length} propuestas)
          </p>
        </header>

        {propuestas.length === 0 ? (
          <div className="rounded-xl border border-outline-variant bg-surface-container p-8 text-center text-on-surface-variant">
            No hay propuestas registradas para este indicador.
          </div>
        ) : (
          <section className="rounded-xl border border-outline-variant bg-surface-container p-6">
            <h2 className="text-lg font-bold text-on-surface mb-3">
              Propuestas ({propuestas.length}{propuestas.length === 100 ? "+" : ""})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left text-xs uppercase tracking-wide text-on-surface-variant">
                    <th className="py-2 pr-3 font-medium">ID</th>
                    <th className="py-2 pr-3 font-medium">Actividad</th>
                    <th className="py-2 pr-3 font-medium">Predio</th>
                    <th className="py-2 pr-3 font-medium">Municipio / Vereda</th>
                    {meta.kind === "lineas" && <th className="py-2 pr-3 font-medium text-right">Longitud</th>}
                    {meta.kind === "poligonos" && <th className="py-2 pr-3 font-medium text-right">Área</th>}
                    <th className="py-2 pr-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {propuestas.map((p) => (
                    <tr key={p.id_propuesta} className="border-b border-outline-variant/50 hover:bg-surface-container-high/50">
                      <td className="py-2 pr-3 text-on-surface-variant font-mono text-xs">
                        #{p.id_propuesta}
                      </td>
                      <td className="py-2 pr-3 text-on-surface">{p.actividad}</td>
                      <td className="py-2 pr-3 text-on-surface">{p.nombre_predio ?? <span className="italic text-on-surface-variant">— sin predio —</span>}</td>
                      <td className="py-2 pr-3 text-on-surface-variant">
                        {p.nombre_municipio ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" /> {p.nombre_municipio}
                            {p.nombre_vereda && <span className="text-on-surface-variant/60"> · {p.nombre_vereda}</span>}
                          </span>
                        ) : (
                          <span className="italic">—</span>
                        )}
                      </td>
                      {meta.kind === "lineas" && (
                        <td className="py-2 pr-3 text-right font-mono text-on-surface">
                          {fmt(p.longitud_km, "km")}
                        </td>
                      )}
                      {meta.kind === "poligonos" && (
                        <td className="py-2 pr-3 text-right font-mono text-on-surface">
                          {fmt(p.hectareas, "ha")}
                        </td>
                      )}
                      <td className="py-2 pr-3 text-right">
                        <Link
                          href={`/intervenciones?componente=${meta.ca.substring(0, 2)}`}
                          className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                        >
                          Ver <ExternalLink className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {propuestas.length === 100 && (
              <p className="mt-3 text-xs text-on-surface-variant italic">
                Mostrando primeras 100 propuestas. Use los filtros de /intervenciones para ver más.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
