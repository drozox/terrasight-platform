// =============================================================================
// /metas/convenio/imprimir — Vista imprimible del reporte de metas
//
// Esta página está optimizada para `window.print() → Save as PDF`.
// Estilos print-only ocultan navegación, sidebar y botones.
// El usuario hace Ctrl+P → "Guardar como PDF".
// =============================================================================

import { Target, Printer } from "lucide-react";
import { getMetasConvenio, INDICADORES_META, type IndicadorKey } from "@/lib/repos/metas-convenio";
import { withFallback } from "@/lib/repos/_helpers";
import { DEMO_METAS_CONVENIO } from "@/lib/demo-data";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Reporte de metas del convenio — SIG TERRITORIO",
};

// Estilos print embebidos (sin globals.css para no contaminar la app)
const PRINT_STYLES = `
@media screen {
  body { background: #f7f9fb; }
}
@media print {
  body { background: white !important; }
  .no-print { display: none !important; }
  section, header { break-inside: avoid; }
  .page-break { page-break-before: always; }
  @page { size: A4; margin: 1.5cm; }
}
`;

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

function statusFor(pct: number): { label: string; color: string } {
  if (pct >= 100) return { label: "Cumplida", color: "#059669" };
  if (pct >= 80) return { label: "Cerca", color: "#f59e0b" };
  if (pct >= 50) return { label: "En curso", color: "#f59e0b" };
  return { label: "Atrasada", color: "#ef4444" };
}

export default async function ImprimirMetasPage() {
  const data = await withFallback("metasConvenio", async () => {
    return getMetasConvenio();
  }, DEMO_METAS_CONVENIO);

  const allIndicadores = [
    ...data.c1a1.indicadores,
    ...data.c1a2.indicadores,
    ...data.c2a1.indicadores,
    ...data.c2a2.indicadores,
    ...data.c3.indicadores,
  ];
  const totalMetas = allIndicadores.filter((i) => i.meta > 0).length;
  const cumplidas = allIndicadores.filter((i) => i.meta > 0 && i.pct >= 100).length;
  const pctGlobal = totalMetas > 0 ? Math.round((cumplidas / totalMetas) * 100) : 0;

  const components = [
    { ca: "C1A1", desc: data.c1a1.descripcion, ind: data.c1a1.indicadores },
    { ca: "C1A2", desc: data.c1a2.descripcion, ind: data.c1a2.indicadores },
    { ca: "C2A1", desc: data.c2a1.descripcion, ind: data.c2a1.indicadores },
    { ca: "C2A2", desc: data.c2a2.descripcion, ind: data.c2a2.indicadores },
    { ca: "C3", desc: data.c3.descripcion, ind: data.c3.indicadores },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      <main className="min-h-screen bg-white px-4 py-8 sm:px-6 lg:px-8 print:py-0">
        <div className="mx-auto max-w-4xl space-y-6 print:space-y-4">
          {/* Print button (only on screen) */}
          <div className="no-print flex justify-end">
            <button
              onClick={() => typeof window !== "undefined" && window.print()}
              className="inline-flex items-center gap-2 rounded-md border border-outline-variant bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Printer className="size-4" />
              Imprimir / Guardar como PDF
            </button>
          </div>

          {/* Header */}
          <header className="border-b-2 border-primary pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Target className="size-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-on-surface-variant">SIG TERRITORIO</p>
                <h1 className="text-2xl font-bold text-on-surface">Reporte de Metas del Convenio</h1>
                <p className="text-sm text-on-surface-variant">CAR Cundinamarca – WWF – Fundación Natura</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant">
              Generado: {formatDate(new Date())} · Período: Inicio del convenio a la fecha
            </p>
          </header>

          {/* Resumen ejecutivo */}
          <section>
            <h2 className="mb-2 text-lg font-bold text-on-surface">Resumen ejecutivo</h2>
            <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-on-surface-variant">Metas cumplidas</p>
                  <p className="text-2xl font-bold text-on-surface">{cumplidas} / {totalMetas}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">% global</p>
                  <p className="text-2xl font-bold text-on-surface">{pctGlobal}%</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Municipios</p>
                  <p className="text-2xl font-bold text-on-surface">{data.municipios_intervenidos.length}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Veredas</p>
                  <p className="text-2xl font-bold text-on-surface">{data.veredas_intervenidas.length}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Detalle por componente */}
          {components.map(({ ca, desc, ind }) => (
            <section key={ca}>
              <h2 className="mb-2 text-lg font-bold text-on-surface">
                {ca} · {desc}
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left text-xs uppercase tracking-wide text-on-surface-variant">
                    <th className="py-2 pr-2 font-medium">Indicador</th>
                    <th className="py-2 pr-2 text-right font-medium">Avance</th>
                    <th className="py-2 pr-2 text-right font-medium">Meta</th>
                    <th className="py-2 pr-2 text-right font-medium">%</th>
                    <th className="py-2 pr-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ind.map((i) => {
                    const s = statusFor(i.pct);
                    return (
                      <tr key={i.label} className="border-b border-outline-variant/50">
                        <td className="py-2 pr-2 text-on-surface">{i.label}</td>
                        <td className="py-2 pr-2 text-right font-mono text-on-surface">
                          {i.actual.toFixed(2)} {i.unidad}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono text-on-surface">
                          {i.meta} {i.unidad}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono font-semibold" style={{ color: s.color }}>
                          {i.pct}%
                        </td>
                        <td className="py-2 pr-2 text-xs" style={{ color: s.color }}>
                          {s.label}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}

          {/* Cobertura territorial */}
          <section className="page-break">
            <h2 className="mb-2 text-lg font-bold text-on-surface">Cobertura territorial</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-1 text-sm font-semibold text-on-surface">
                  Municipios intervenidos ({data.municipios_intervenidos.length})
                </h3>
                <ul className="text-sm text-on-surface-variant">
                  {data.municipios_intervenidos.map((m) => (
                    <li key={m.id_municipio} className="flex justify-between border-b border-outline-variant/30 py-1">
                      <span>{m.nombre}</span>
                      <span className="text-xs">{m.num_propuestas} propuestas</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-semibold text-on-surface">
                  Veredas intervenidas ({data.veredas_intervenidas.length})
                </h3>
                <ul className="max-h-72 overflow-y-auto text-sm text-on-surface-variant print:max-h-none">
                  {data.veredas_intervenidas.slice(0, 30).map((v) => (
                    <li key={v.id_vereda} className="flex justify-between border-b border-outline-variant/30 py-1">
                      <span>{v.nombre}</span>
                      <span className="text-xs">{v.nombre_municipio}</span>
                    </li>
                  ))}
                  {data.veredas_intervenidas.length > 30 && (
                    <li className="py-1 text-xs italic">
                      + {data.veredas_intervenidas.length - 30} veredas más…
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
            <p>
              Reporte generado automáticamente por <strong>SIG TERRITORIO</strong>.
              Datos al {formatDate(new Date())}. Para drill-down interactivo, visitar{" "}
              <code className="font-mono">/metas/convenio</code>.
            </p>
            <p className="mt-1">
              Nota: 692 propuestas de tipo punto no tienen geometría, por lo que no se cuentan en la
              cobertura territorial por intersección espacial. Se asignan al municipio del predio
              cuando existe.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
