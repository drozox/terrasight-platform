// =============================================================================
// /metas/convenio — Indicadores del convenio CAR-WWF-Fundación Natura
//
// Muestra 5 metas operativas con su avance vs target + municipios/veredas
// intervenidos. Datos de src/lib/repos/metas-convenio.ts.
// =============================================================================

import Link from "next/link";
import { ArrowRight, AlertTriangle, MapPin, Building2, Target } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { getMetasConvenio, INDICADORES_META, type IndicadorKey } from "@/lib/repos/metas-convenio";
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

function IndicadorCard({
  indicadorKey, label, actual, meta, unidad, pct: p, className, statusLabel,
}: {
  indicadorKey: string;
  label: string;
  actual: number;
  meta: number;
  unidad: string;
  pct: number;
  className: string;
  statusLabel: string;
}) {
  return (
    <Link
      href={`/metas/convenio/propuestas?indicador=${indicadorKey}`}
      className="block rounded-lg border border-outline-variant bg-surface-container-lowest p-4 hover:border-primary hover:shadow-sm transition-all group"
    >
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-on-surface group-hover:text-primary">{label}</span>
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
      <div className="mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Ver propuestas →
      </div>
    </Link>
  );
}

function BloqueComponente({
  ca, titulo, descripcion, indicadores, indicadoresKeys,
}: {
  ca: string;
  titulo: string;
  descripcion: string;
  indicadores: { label: string; actual: number; meta: number; unidad: string; pct: number }[];
  indicadoresKeys: IndicadorKey[];
}) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container p-6">
      <header className="mb-4">
        <div className="text-xs uppercase tracking-wide text-primary font-semibold">{ca}</div>
        <h2 className="text-xl font-bold text-on-surface">{titulo}</h2>
        <p className="text-sm text-on-surface-variant mt-1">{descripcion}</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {indicadores.map((ind, i) => {
          const p = pct(ind);
          return (
            <IndicadorCard
              key={ind.label}
              indicadorKey={indicadoresKeys[i]}
              label={ind.label}
              actual={ind.actual}
              meta={ind.meta}
              unidad={ind.unidad}
              pct={p.pct}
              className={p.className}
              statusLabel={p.label}
            />
          );
        })}
      </div>
    </section>
  );
}

// Tabla compacta: 1 vistazo a los 10 indicadores
function TablaCompacta({
  filas,
}: {
  filas: { ca: string; componente: string; accion: string; label: string; actual: number; meta: number; unidad: string; pct: number; key: IndicadorKey }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-outline-variant text-left text-xs uppercase tracking-wide text-on-surface-variant">
            <th className="py-2 pr-2 font-medium">Componente</th>
            <th className="py-2 pr-2 font-medium">Indicador</th>
            <th className="py-2 pr-2 font-medium text-right">Avance</th>
            <th className="py-2 pr-2 font-medium text-right">%</th>
            <th className="py-2 pr-2 font-medium">Estado</th>
            <th className="py-2 pr-2"></th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const p = pct({ actual: f.actual, meta: f.meta });
            return (
              <tr key={f.key} className="border-b border-outline-variant/50 hover:bg-surface-container-high/40">
                <td className="py-2 pr-2 text-on-surface-variant font-mono text-xs">{f.ca}</td>
                <td className="py-2 pr-2 text-on-surface">{f.label}</td>
                <td className="py-2 pr-2 text-right font-mono text-on-surface text-xs">
                  {f.actual.toFixed(2)} / {f.meta} {f.unidad}
                </td>
                <td className="py-2 pr-2 text-right font-mono text-on-surface font-semibold">{p.pct}%</td>
                <td className="py-2 pr-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${p.className.replace("bg-", "bg-")}`} />
                  <span className="ml-1 text-xs text-on-surface-variant">{p.label.replace(/^\d+% — /, "")}</span>
                </td>
                <td className="py-2 pr-2 text-right">
                  <Link href={`/metas/convenio/propuestas?indicador=${f.key}`} className="text-primary text-xs hover:underline">
                    Ver →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const COMPONENT_LABELS: Record<string, string> = {
  c1a1: "Conservación del Recurso Hídrico",
  c1a2: "Conectividad y reconversión agroforestal",
  c2a1: "Manejo del Ciclo del Agua y Restauración de Suelos",
  c2a2: "Estaciones Limnimétricas y Obras de Captación",
  c3: "Reconversión Productiva en Áreas Protegidas y Páramos",
};

const PIE_COLORS = ["#059669", "#f59e0b", "#ef4444", "#6b7280"];

export default async function MetasConvenioPage() {
  const data = await withFallback("metasConvenio", async () => {
    return getMetasConvenio();
  }, DEMO_METAS_CONVENIO);
  return <MetasConvenioView data={data} />;
}

function MetasConvenioView({
  data,
}: {
  data: Awaited<ReturnType<typeof getMetasConvenio>>;
}) {
  // Resumen global
  const allIndicadores = [
    ...data.c1a1.indicadores,
    ...data.c1a2.indicadores,
    ...data.c2a1.indicadores,
    ...data.c2a2.indicadores,
    ...data.c3.indicadores,
  ];
  const totalMetas = allIndicadores.filter((i) => i.meta > 0).length;
  const cumplidas = allIndicadores.filter((i) => i.meta > 0 && i.pct >= 100).length;
  const cerca = allIndicadores.filter((i) => i.meta > 0 && i.pct >= 80 && i.pct < 100).length;
  const enCurso = allIndicadores.filter((i) => i.meta > 0 && i.pct >= 50 && i.pct < 80).length;
  const atrasadas = allIndicadores.filter((i) => i.meta > 0 && i.pct < 50).length;
  const pctGlobal = totalMetas > 0 ? Math.round((cumplidas / totalMetas) * 100) : 0;

  // Datos para torta
  const pieData = [
    { name: "Cumplidas (≥100%)", value: cumplidas, color: PIE_COLORS[0] },
    { name: "Cerca (80-99%)", value: cerca, color: PIE_COLORS[1] },
    { name: "En curso (50-79%)", value: enCurso, color: PIE_COLORS[2] },
    { name: "Atrasadas (<50%)", value: atrasadas, color: PIE_COLORS[3] },
  ].filter((d) => d.value > 0);

  // Filas para tabla compacta
  const filasTabla: {
    ca: string; componente: string; accion: string; label: string;
    actual: number; meta: number; unidad: string; pct: number; key: IndicadorKey;
  }[] = [
    ...data.c1a1.indicadores.map((i, idx) => ({
      ca: "C1A1", componente: "C1", accion: "A1", label: i.label,
      actual: i.actual, meta: i.meta, unidad: i.unidad, pct: i.pct,
      key: ["cercos_vivos", "alambre"][idx] as IndicadorKey,
    })),
    ...data.c1a2.indicadores.map((i, idx) => ({
      ca: "C1A2", componente: "C1", accion: "A2", label: i.label,
      actual: i.actual, meta: i.meta, unidad: i.unidad, pct: i.pct,
      key: ["conectividad", "silvopastoril", "agroforestal"][idx] as IndicadorKey,
    })),
    ...data.c2a1.indicadores.map((i, idx) => ({
      ca: "C2A1", componente: "C2", accion: "A1", label: i.label,
      actual: i.actual, meta: i.meta, unidad: i.unidad, pct: i.pct,
      key: ["cosecha", "compostaje"][idx] as IndicadorKey,
    })),
    ...data.c2a2.indicadores.map((i, idx) => ({
      ca: "C2A2", componente: "C2", accion: "A2", label: i.label,
      actual: i.actual, meta: i.meta, unidad: i.unidad, pct: i.pct,
      key: ["estaciones", "obras_captacion"][idx] as IndicadorKey,
    })),
    ...data.c3.indicadores.map((i) => ({
      ca: "C3", componente: "C3", accion: "*", label: i.label,
      actual: i.actual, meta: i.meta, unidad: i.unidad, pct: i.pct,
      key: "predios_c3" as IndicadorKey,
    })),
  ];

  // Indicadores con alerta (atrasados < 50%)
  const alertas = filasTabla.filter((f) => f.pct < 50 && f.meta > 0);

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-on-surface inline-flex items-center gap-2">
            <Target className="size-7 text-primary" /> Metas del convenio
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Convenio CAR Cundinamarca – WWF – Fundación Natura. Avance operativo por componente y acción.
          </p>
        </header>

        {/* Banner de calidad de datos */}
        <section className="rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex gap-3">
          <AlertTriangle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <strong>Calidad de datos:</strong> 692 propuestas de tipo punto (Cosecha de agua, Compostaje, Estaciones, Obras) no tienen geometría,
            por lo que no se cuentan en la cobertura territorial por intersección espacial. Se asignan al municipio del predio cuando existe.
            La meta de estaciones limnimétricas y obras de captación suma todas las instancias en cualquier componente-acción (no solo C2A2).
            Datos al {new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}.
          </div>
        </section>

        {/* Banner de alertas automáticas */}
        {alertas.length > 0 && (
          <section className="rounded-xl border border-red-500/30 bg-red-50/50 dark:bg-red-950/20 p-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold mb-1">
              <AlertTriangle className="size-4" /> {alertas.length} meta{alertas.length === 1 ? "" : "s"} atrasada{alertas.length === 1 ? "" : "s"} (&lt;50% de avance)
            </div>
            <ul className="text-sm text-red-900 dark:text-red-200 list-disc list-inside">
              {alertas.map((a) => (
                <li key={a.key}>
                  <strong>{a.ca}</strong> · {a.label} — {a.actual.toFixed(2)} / {a.meta} {a.unidad} ({a.pct}%)
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Resumen global + gráfico */}
        <section className="rounded-xl border border-outline-variant bg-surface-container p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
                <h2 className="text-xl font-bold text-on-surface">Cumplimiento global</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-on-surface">{cumplidas}/{totalMetas}</span>
                  <span className="text-sm text-on-surface-variant">metas cumplidas</span>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className={pctGlobal >= 80 ? "h-full bg-emerald-600" : pctGlobal >= 50 ? "h-full bg-amber-500" : "h-full bg-red-500"}
                  style={{ width: `${Math.min(100, pctGlobal)}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                <span>🟢 Cumplidas: {cumplidas}</span>
                <span>🟡 Cerca (80–99%): {cerca}</span>
                <span>🟠 En curso (50–79%): {enCurso}</span>
                <span>🔴 Atrasadas (&lt;50%): {atrasadas}</span>
              </div>
            </div>
            <div className="h-48">
              {pieData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        {/* Tabla compacta — 1 vistazo a los 10 indicadores */}
        <section className="rounded-xl border border-outline-variant bg-surface-container p-6">
          <h2 className="text-lg font-bold text-on-surface mb-3">Resumen de los 10 indicadores</h2>
          <TablaCompacta filas={filasTabla} />
        </section>

        {/* Detalle por componente */}
        <BloqueComponente
          ca="C1A1"
          titulo={COMPONENT_LABELS.c1a1}
          descripcion="Propuestas_línea con filtro por componente. 12 km de cercos vivos + 12 km de aislamientos (cerco de alambre)."
          indicadores={data.c1a1.indicadores}
          indicadoresKeys={["cercos_vivos", "alambre"]}
        />

        <BloqueComponente
          ca="C1A2"
          titulo={COMPONENT_LABELS.c1a2}
          descripcion="Franjas de conectividad se miden en km (líneas). Silvopastoriles y agroforestales en ha (polígonos). Meta: 15 (km o ha) por cada categoría."
          indicadores={data.c1a2.indicadores}
          indicadoresKeys={["conectividad", "silvopastoril", "agroforestal"]}
        />

        <BloqueComponente
          ca="C2A1"
          titulo={COMPONENT_LABELS.c2a1}
          descripcion="Propuestas_punto. 79 cosecha de agua + 79 kit de compostaje. Meta cumplida al 100%."
          indicadores={data.c2a1.indicadores}
          indicadoresKeys={["cosecha", "compostaje"]}
        />

        <BloqueComponente
          ca="C2A2"
          titulo={COMPONENT_LABELS.c2a2}
          descripcion="Propuestas_punto. Suma total de Estaciones limnimétricas (7) + Obras de captación (48). Meta superada en obras."
          indicadores={data.c2a2.indicadores}
          indicadoresKeys={["estaciones", "obras_captacion"]}
        />

        <BloqueComponente
          ca="C3"
          titulo={COMPONENT_LABELS.c3}
          descripcion="Predios intervenidos en áreas protegidas. Meta: 35 predios. Identifica predios con propuestas C3 (un predio = suma de 1+ polígonos con mismo Nompredio)."
          indicadores={data.c3.indicadores}
          indicadoresKeys={["predios_c3"]}
        />

        {/* Cobertura territorial */}
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
                  <li key={m.id_municipio}>
                    <Link
                      href={`/metas/convenio/${m.id_municipio}`}
                      className="flex items-baseline justify-between py-2 px-2 -mx-2 rounded hover:bg-surface-container-high transition-colors group"
                    >
                      <span className="text-sm text-on-surface group-hover:text-primary">{m.nombre}</span>
                      <span className="text-xs text-on-surface-variant inline-flex items-center gap-1">
                        {m.num_propuestas} propuestas <ArrowRight className="size-3" />
                      </span>
                    </Link>
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
