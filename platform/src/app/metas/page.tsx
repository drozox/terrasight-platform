// =============================================================================
// /metas — Dashboard de metas del convenio por Componente/Acción (S5.M)
//
// Server Component:
//   - requireUser (cualquier usuario logueado ve las metas)
//   - Carga 3 fuentes en paralelo: metas, global, municipios
//   - Render: hero + 4 cards (C1A1, C1A2, C2A1, C2A2) + sección municipios
//
// C3 (35 predios en áreas protegidas) NO se muestra porque la BD no tiene
// acciones C3A1/C3A2 (TODO migración 13). Ver sql/12-metas.sql.
//
// UX-? — el patrón "card con progress bar" es nuevo en la plataforma.
//       Reutilizable para futuros módulos (ej. avance por municipio, etc).
// =============================================================================

import { Target, Building2, ChevronRight, AlertCircle, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requireUser } from "@/lib/auth-guard";
import {
  getMetasResumen,
  getMetasGlobal,
  getMunicipiosIntervenidos,
} from "@/lib/repos/metas";
import type { MetaResumen } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Metas del convenio — TerraSight" };

// -----------------------------------------------------------------------------
// Labels "humanos" para cada Componente/Acción.
//   Mapeo del par (C,A) al nombre que ve el cliente. Si en el futuro la BD
//   tiene descripciones de las acciones, se reemplaza este dict por una query.
// -----------------------------------------------------------------------------
const CA_LABELS: Record<string, string> = {
  "C1-A1": "Conservación del recurso hídrico",
  "C1-A2": "Conectividad, silvopastoril y agroforestal",
  "C2-A1": "Manejo del ciclo del agua y restauración de suelos",
  "C2-A2": "Estaciones limnimétricas y obras de captación",
};

// -----------------------------------------------------------------------------
// colorForPct — mapea % a clase Tailwind.
//   0-49  → rojo/atención
//   50-99 → azul/en progreso
//   100   → verde/logrado
//   >100  → verde claro/超额
// -----------------------------------------------------------------------------
function colorForPct(pct: number, currentOver: boolean) {
  if (currentOver) return "bg-tertiary"; //超额
  if (pct >= 100)  return "bg-primary";
  if (pct >= 50)   return "bg-info";
  if (pct >= 25)   return "bg-warning";
  return "bg-error";
}

function fmtNumber(n: number, unit: string): string {
  // km y ha con 2 decimales; unidades enteras sin decimal.
  if (unit === "unidades") return n.toFixed(0);
  return n.toFixed(2);
}

// =============================================================================
// Página
// =============================================================================
export default async function MetasPage() {
  await requireUser();
  const [metas, global, municipios] = await Promise.all([
    getMetasResumen(),
    getMetasGlobal(),
    getMunicipiosIntervenidos(),
  ]);

  // Agrupa metas por par (componente, accion) para las cards.
  const groups = new Map<string, MetaResumen[]>();
  for (const m of metas) {
    const key = `${m.componente}-${m.accion}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  const groupKeys = Array.from(groups.keys()).sort();

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-surface-container-lowest px-margin-edge py-6">
      {/* ====================================================================
          Hero — % global de avance
          ==================================================================== */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Metas del convenio</h1>
            <p className="text-body-sm text-on-surface-variant">
              Avance por Componente/Acción. Fuente: capas de propuestas filtradas por
              actividad y consolidadas en <code className="rounded bg-surface-container px-1">sgs_v_metas_resumen</code>.
            </p>
          </div>
        </div>
      </header>

      <Card className="mb-6 border-primary/30 bg-primary/5 p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <p className="text-label-lg uppercase tracking-wider text-on-surface-variant">
              Metas cumplidas
            </p>
            <p className="mt-1 text-4xl font-bold text-primary">
              {global.metasCumplidas}
              <span className="ml-1 text-2xl text-on-surface-variant">/ {global.totalMetas}</span>
            </p>
            <p className="mt-1 text-[11px] text-on-surface-variant">
              Metas con current ≥ meta
            </p>
          </div>
          <div>
            <p className="text-label-lg uppercase tracking-wider text-on-surface-variant">
              Avance global ponderado
            </p>
            <p className="mt-1 text-4xl font-bold text-on-surface">
              {global.pct.toFixed(1)}<span className="ml-1 text-2xl">%</span>
            </p>
            <ProgressBar pct={global.pct} big />
            <p className="mt-1 text-[11px] text-on-surface-variant">
              Σ current / Σ meta (cualquier unidad)
            </p>
          </div>
          <div>
            <p className="text-label-lg uppercase tracking-wider text-on-surface-variant">
              Municipios intervenidos
            </p>
            <p className="mt-1 text-4xl font-bold text-on-surface">
              {municipios.length}
            </p>
            <p className="mt-1 text-[11px] text-on-surface-variant">
              Con al menos 1 propuesta
            </p>
          </div>
        </div>
      </Card>

      {/* ====================================================================
          Cards por Componente/Acción
          ==================================================================== */}
      <h2 className="mb-3 text-title-lg font-bold text-on-surface">Por Componente / Acción</h2>
      {groupKeys.length === 0 ? (
        <Card className="p-6">
          <div className="flex items-center gap-3 text-on-surface-variant">
            <AlertCircle className="size-5" />
            <p>No hay metas configuradas todavía. Ver migración 12-metas.sql.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groupKeys.map((key) => {
            const items = groups.get(key)!;
            const [componente, accion] = key.split("-");
            const label = CA_LABELS[key] ?? `Componente ${componente} · Acción ${accion}`;
            return (
              <Card key={key}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {componente}{accion}
                      <span className="ml-2 text-sm font-normal text-on-surface-variant">
                        {label}
                      </span>
                    </CardTitle>
                    <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                      {items.length} meta{items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <CardDescription>
                    Capas usadas: {items.map((i) => i.metaKey).join(", ")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((m) => (
                    <MetaRow key={m.metaKey} m={m} />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ====================================================================
          Municipios intervenidos
          ==================================================================== */}
      <h2 className="mb-3 mt-8 text-title-lg font-bold text-on-surface">Cobertura territorial</h2>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <MapPin className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base">
                {municipios.length} municipio{municipios.length === 1 ? "" : "s"} intervenido{municipios.length === 1 ? "" : "s"}
              </CardTitle>
              <CardDescription>
                Municipios con al menos una propuesta. Click para ver en el mapa (próxima fase).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {municipios.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">
              Aún no hay propuestas cargadas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-low text-[11px] uppercase tracking-wider text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Municipio</th>
                    <th className="px-4 py-3 font-semibold">Departamento</th>
                    <th className="px-4 py-3 text-right font-semibold">Propuestas</th>
                    <th className="px-4 py-3 text-right font-semibold">Predios</th>
                    <th className="px-4 py-3 text-right font-semibold">Veredas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {municipios.map((m) => (
                    <tr key={m.idMunicipio} className="hover:bg-surface-container-low/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 text-on-surface-variant" />
                          <span className="font-medium text-on-surface">{m.nombreMunicipio}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">{m.departamento}</td>
                      <td className="px-4 py-3 text-right font-mono text-on-surface">{m.numPropuestas}</td>
                      <td className="px-4 py-3 text-right font-mono text-on-surface-variant">{m.numPredios}</td>
                      <td className="px-4 py-3 text-right font-mono text-on-surface-variant">{m.numVeredas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <footer className="mt-10 border-t border-outline-variant pt-4 text-[11px] text-on-surface-variant">
        Datos en tiempo real desde la BD. C3 (35 predios en áreas protegidas) requiere
        migración 13 (acciones C3A1/C3A2) y se mostrará automáticamente cuando esté aplicada.
        <ChevronRight className="mx-1 inline size-3" />
        Vista drill-down por municipio: próxima fase.
      </footer>
    </div>
  );
}

// =============================================================================
// Sub-componentes server (no usan estado)
// =============================================================================
function MetaRow({ m }: { m: MetaResumen }) {
  const currentOver = m.currentValue > m.metaValue;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-on-surface">{m.metaLabel}</p>
        <p className="font-mono text-[12px] text-on-surface">
          <span className="font-semibold">{fmtNumber(m.currentValue, m.currentUnit)}</span>
          <span className="text-on-surface-variant"> / {fmtNumber(m.metaValue, m.metaUnit)} {m.metaUnit}</span>
        </p>
      </div>
      <ProgressBar pct={m.pct} currentOver={currentOver} />
      <p className="mt-1 text-[11px] text-on-surface-variant">
        {m.countPropuestas} propuesta{m.countPropuestas === 1 ? "" : "s"} contribute{m.countPropuestas === 1 ? "" : "n"}
        {currentOver && (
          <span className="ml-2 font-semibold text-tertiary">· Meta superada</span>
        )}
      </p>
    </div>
  );
}

function ProgressBar({
  pct,
  big = false,
  currentOver = false,
}: {
  pct: number;
  big?: boolean;
  currentOver?: boolean;
}) {
  const fillClass = colorForPct(pct, currentOver);
  const heightClass = big ? "h-3" : "h-2";
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-surface-variant/40 ${heightClass}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${heightClass} ${fillClass} transition-all duration-500`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}
