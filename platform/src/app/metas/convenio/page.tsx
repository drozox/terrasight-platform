// =============================================================================
// /metas/convenio — Indicadores del convenio CAR-WWF-Fundación Natura
//
// Muestra 5 metas operativas con su avance vs target + municipios/veredas
// intervenidos. Datos de src/lib/repos/metas-convenio.ts.
// =============================================================================

import { getMetasConvenio } from "@/lib/repos/metas-convenio";
import { withFallback } from "@/lib/repos/_helpers";
import { DEMO_METAS_CONVENIO } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Metas del convenio — SIG TERRITORIO",
  description: "Avance operativo de las 5 metas del convenio CAR-WWF-Fundación Natura",
};

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

function BloqueComponente({ titulo, descripcion, indicadores }: {
  titulo: string;
  descripcion: string;
  indicadores: { label: string; actual: number; meta: number; unidad: string; pct: number }[];
}) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container p-6">
      <header className="mb-4">
        <h2 className="text-xl font-bold text-on-surface">{titulo}</h2>
        <p className="text-sm text-on-surface-variant mt-1">{descripcion}</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {indicadores.map((ind) => {
          const p = pct(ind);
          return <IndicadorCard key={ind.label} {...ind} pct={p.pct} className={p.className} statusLabel={p.label} />;
        })}
      </div>
    </section>
  );
}

export default async function MetasConvenioPage() {
  const data = await withFallback("metasConvenio", async () => {
    return getMetasConvenio();
  }, DEMO_METAS_CONVENIO);
  return <MetasConvenioView data={data} />;
}

function MetasConvenioView({ data }: { data: Awaited<ReturnType<typeof getMetasConvenio>> }) {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-on-surface">Metas del convenio</h1>
          <p className="mt-2 text-on-surface-variant">
            Convenio CAR Cundinamarca – WWF – Fundación Natura. Avance operativo por componente y acción.
          </p>
        </header>

        <BloqueComponente
          titulo={`${data.c1a1.componente}${data.c1a1.accion} · ${data.c1a1.descripcion}`}
          descripcion="Propuestas_línea con filtro por componente. 12 km de cercos vivos + 12 km de aislamientos."
          indicadores={data.c1a1.indicadores}
        />

        <BloqueComponente
          titulo={`${data.c1a2.componente}${data.c1a2.accion} · ${data.c1a2.descripcion}`}
          descripcion="Propuestas_polígono. 15 ha por cada categoría: conectividad, silvopastoriles, agroforestales."
          indicadores={data.c1a2.indicadores}
        />

        <BloqueComponente
          titulo={`${data.c2a1.componente}${data.c2a1.accion} · ${data.c2a1.descripcion}`}
          descripcion="Propuestas_punto. 79 cosecha de agua + 79 kit de compostaje."
          indicadores={data.c2a1.indicadores}
        />

        <BloqueComponente
          titulo={`${data.c2a2.componente}${data.c2a2.accion} · ${data.c2a2.descripcion}`}
          descripcion="Propuestas_punto. 7 estaciones limnimétricas + 48 obras de captación."
          indicadores={data.c2a2.indicadores}
        />

        <BloqueComponente
          titulo={`${data.c3.componente} · ${data.c3.descripcion}`}
          descripcion="Predios intervenidos en áreas protegidas. Meta: 35 predios."
          indicadores={data.c3.indicadores}
        />

        {/* Adicional: cobertura territorial */}
        <section className="rounded-xl border border-outline-variant bg-surface-container p-6">
          <header className="mb-4">
            <h2 className="text-xl font-bold text-on-surface">Cobertura territorial</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              {data.municipios_intervenidos.length} municipios y {data.veredas_intervenidas.length} veredas con al menos una propuesta.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-on-surface mb-2">Municipios intervenidos</h3>
              <ul className="divide-y divide-outline-variant">
                {data.municipios_intervenidos.map((m) => (
                  <li key={m.id_municipio} className="flex items-baseline justify-between py-2">
                    <span className="text-sm text-on-surface">{m.nombre}</span>
                    <span className="text-xs text-on-surface-variant">{m.num_propuestas} propuestas</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-on-surface mb-2">Veredas intervenidas</h3>
              <ul className="divide-y divide-outline-variant max-h-96 overflow-y-auto">
                {data.veredas_intervenidas.slice(0, 30).map((v) => (
                  <li key={v.id_vereda} className="flex items-baseline justify-between py-1.5">
                    <span className="text-sm text-on-surface">{v.nombre}</span>
                    <span className="text-xs text-on-surface-variant">
                      {v.nombre_municipio} · {v.num_propuestas}
                    </span>
                  </li>
                ))}
                {data.veredas_intervenidas.length > 30 && (
                  <li className="text-xs text-on-surface-variant italic py-2">
                    + {data.veredas_intervenidas.length - 30} más…
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
