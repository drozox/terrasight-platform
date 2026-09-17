import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SortableHeader } from "@/components/ui/sortable-header";
import {
  Wrench,
  ArrowRight,
  Inbox,
  Plus,
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import {
  getIntervencionesRecientes,
  getConteoIntervenciones,
  getConteosIntervenciones,
} from "@/lib/repos";
import { getCurrentUser } from "@/lib/auth-guard";
import { formatDecimal, formatInt } from "@/lib/utils";
import { normalizarAccion } from "@/lib/acciones";
import { EstadoIntervencionDropdown } from "./estado-dropdown";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  componente?: string;
  accion?: string;
  page?: string;
  sort?: string;
  order?: "asc" | "desc";
}>;

// UX-65 (audit 2026-07-24): paginacion basica via searchParams.
const PAGE_SIZE = 25;

const COMPONENT_COLOR: Record<string, "primary" | "secondary" | "tertiary"> = {
  C1: "primary",
  C2: "secondary",
  C3: "tertiary",
};

const COMPONENT_ACTIVE_BG: Record<"primary" | "secondary" | "tertiary", string> = {
  primary:   "border-primary bg-primary text-on-primary",
  secondary: "border-secondary bg-secondary text-on-secondary",
  tertiary:  "border-tertiary bg-tertiary text-on-tertiary",
};

// T1 filtro-accion: codigos visibles por componente (C3 solo tiene C3AU).
const ACCIONES_POR_COMPONENTE: Record<string, readonly string[]> = {
  C1: ["C1A1", "C1A2"],
  C2: ["C2A1", "C2A2"],
  C3: ["C3AU"],
};

// AJUSTE 2: etiqueta humana del filtro activo (sin contar aún — eso va aparte).
function etiquetaFiltro(componente: string | null, accion: string | null): string {
  if (!componente && !accion) return "Todas las intervenciones";
  if (componente && !accion) return `Componente ${componente}`;
  if (componente && accion) return `${componente}${accion}`;
  return accion ?? "";
}

// UX-65: helper para construir el URL de paginacion preservando el filtro.
function buildPageUrl(componente: string | null, accion: string | null, page: number): string {
  const params = new URLSearchParams();
  if (componente) params.set("componente", componente);
  if (accion) params.set("accion", accion);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/intervenciones?${qs}` : "/intervenciones";
}

export default async function IntervencionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [params, usuario] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);
  const componente = params.componente ?? null;
  // T1 filtro-accion: el URL ahora lleva el código CxAy (no el nombre).
  // `normalizarAccion` valida: si el valor no es un código válido (legacy
  // "A1"/"A2" o vacío), devuelve null y NO se filtra.
  const accion = normalizarAccion(params.accion);
  // UX-65 (audit 2026-07-24): paginacion. page=1 default. Cap a 9999
  // (mas alla es claramente input malicioso).
  const pageNum = Math.max(1, Math.min(9999, Number(params.page ?? "1") || 1));
  const sort = params.sort ?? "id";
  const order = params.order === "desc" ? "desc" : "asc";
  const canEdit = usuario?.rol === "ADMIN" || usuario?.rol === "GESTOR";

  // Pedimos 1 fila extra para saber si hay mas paginas sin un COUNT extra.
  // AJUSTE 2: agregar `conteoTotal` (COUNT real por filtro) y `conteosGlobales`
  // para mostrar los numeros reales en los chips.
  const [intervenciones, conteoTotal, conteosGlobales] =
    await Promise.all([
      getIntervencionesRecientes(PAGE_SIZE + 1, componente, accion),
      getConteoIntervenciones(componente, accion),
      getConteosIntervenciones(),
    ]);

  const totalPorComponente = conteosGlobales.porComponente;
  const conteoPorAccion = conteosGlobales.porAccion;

  // UX-65: aplicamos paginacion client-side sobre la lista que ya vino
  // del server. Cortamos a PAGE_SIZE (la fila +1 era para detectar "hay mas").
  const hasNextPage = intervenciones.length > PAGE_SIZE;
  // UX-80: sort server-side sobre la lista de la página
  const sorted = [...intervenciones].sort((a, b) => {
    const fieldMap: Record<string, string> = {
      id: "id",
      actividad: "actividad",
      nombrePredio: "nombrePredio",
      municipio: "municipio",
      componente: "componente",
      estado: "estado",
      avance: "avance",
    };
    const key = fieldMap[sort] ?? "id";
    const av = (a as unknown as Record<string, unknown>)[key];
    const bv = (b as unknown as Record<string, unknown>)[key];
    let cmp = 0;
    if (av == null && bv == null) cmp = 0;
    else if (av == null) cmp = 1;
    else if (bv == null) cmp = -1;
    else if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv), "es-CO", { numeric: true });
    return order === "asc" ? cmp : -cmp;
  });
  const intervencionesPage = sorted.slice(0, PAGE_SIZE);
  const offset = (pageNum - 1) * PAGE_SIZE;

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-7xl flex-col gap-gutter">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <Wrench className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">
                Intervenciones
              </h1>
              <p className="text-body-sm text-on-surface-variant">
                {etiquetaFiltro(componente, accion)}
                {" · "}
                <span className="font-bold text-on-surface">
                  {formatInt(conteoTotal)} {conteoTotal === 1 ? "propuesta" : "propuestas"}
                </span>
                {" · "}
                {formatInt(
                  intervencionesPage.reduce((acc, i) => acc + (i.hectareas ?? 0), 0),
                )}{" "}
                ha en página · pág {pageNum}
              </p>
            </div>
          </div>
          {/* DEEPSEEK-F2: botón para crear nueva propuesta/intervención */}
          <Link href="/intervenciones/nueva">
            <Button>
              <Plus className="size-4" />
              Nueva intervención
            </Button>
          </Link>
        </div>

        {/* Chips de filtro por componente */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/intervenciones"
            className={`rounded-full border px-3 py-1 text-label-lg font-bold transition-colors ${
              !componente
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant"
            }`}
          >
            Todas ({formatInt(conteosGlobales.total)})
          </Link>
          {(["C1", "C2", "C3"] as const).map((c) => {
            const color = COMPONENT_COLOR[c];
            return (
              <Link
                key={c}
                href={`/intervenciones?componente=${c}`}
                className={`rounded-full border px-3 py-1 text-label-lg font-bold transition-colors ${
                  componente === c
                    ? COMPONENT_ACTIVE_BG[color]
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                {c} ({formatInt(totalPorComponente[c] ?? 0)})
              </Link>
            );
          })}
        </div>

        {/* DEEPSEEK-F2: chips de acción (solo si hay componente activo) */}
        {componente && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label-lg font-bold text-on-surface-variant">
              Acción:
            </span>
            <Link
              href={`/intervenciones?componente=${componente}`}
              className={`rounded-full border px-3 py-1 text-label-lg font-bold transition-colors ${
                !accion
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant"
              }`}
            >
              Todas ({formatInt(totalPorComponente[componente] ?? 0)})
            </Link>
            {(ACCIONES_POR_COMPONENTE[componente] ?? []).map((a) => (
              <Link
                key={a}
                href={`/intervenciones?componente=${componente}&accion=${a}`}
                className={`rounded-full border px-3 py-1 text-label-lg font-bold transition-colors ${
                  accion === a
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                {a} ({formatInt(conteoPorAccion[a] ?? 0)})
              </Link>
            ))}
          </div>
        )}

        {/* ERROR 3: reporte de intervenciones por cada una de las 5 acciones */}
        <section className="rounded-xl border border-outline-variant bg-surface-container p-4">
          <h2 className="mb-3 text-label-lg font-bold text-on-surface">
            Intervenciones por acción
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(["C1A1", "C1A2", "C2A1", "C2A2", "C3AU"] as const).map((code) => {
              const n = conteoPorAccion[code] ?? 0;
              const activo = accion === code;
              return (
                <Link
                  key={code}
                  href={`/intervenciones?componente=${code.slice(0, 2)}&accion=${code}`}
                  className={`rounded-lg border p-3 transition-colors ${
                    activo
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant bg-surface-container-lowest hover:border-primary/40"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase text-on-surface-variant">
                    {code}
                  </p>
                  <p className="mt-0.5 text-xl font-bold text-on-surface">
                    {formatInt(n)}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* UX-65: indicador de rango + paginador. Server-rendered,
           la paginación se hace via searchParams. */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-body-sm text-on-surface-variant">
          <p>
            {intervencionesPage.length === 0
              ? "Sin resultados"
              : `Mostrando ${offset + 1}–${offset + intervencionesPage.length}`}
            {hasNextPage && " (hay más)"}
          </p>
          <div className="flex items-center gap-1">
            <Link
              href={buildPageUrl(componente, accion, Math.max(1, pageNum - 1))}
              aria-disabled={pageNum === 1}
              className={`flex h-8 items-center gap-1 rounded-md border border-outline-variant px-3 text-label-lg font-bold transition-colors ${
                pageNum === 1
                  ? "pointer-events-none opacity-40"
                  : "hover:border-primary hover:bg-primary/5"
              }`}
            >
              ← Anterior
            </Link>
            <span className="px-2 text-label-lg font-bold">pág {pageNum}</span>
            <Link
              href={buildPageUrl(componente, accion, pageNum + 1)}
              aria-disabled={!hasNextPage}
              className={`flex h-8 items-center gap-1 rounded-md border border-outline-variant px-3 text-label-lg font-bold transition-colors ${
                !hasNextPage
                  ? "pointer-events-none opacity-40"
                  : "hover:border-primary hover:bg-primary/5"
              }`}
            >
              Siguiente →
            </Link>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-body-sm">
              <thead>
                <tr className="bg-surface-container-low text-[11px] font-bold uppercase text-on-surface-variant">
                  <th className="px-4 py-3">
                    <SortableHeader field="id" currentSort={sort} currentOrder={order} basePath="/intervenciones" searchParams={{ componente: componente ?? undefined, accion: accion ?? undefined }}>ID</SortableHeader>
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader field="actividad" currentSort={sort} currentOrder={order} basePath="/intervenciones" searchParams={{ componente: componente ?? undefined, accion: accion ?? undefined }}>Actividad</SortableHeader>
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader field="nombrePredio" currentSort={sort} currentOrder={order} basePath="/intervenciones" searchParams={{ componente: componente ?? undefined, accion: accion ?? undefined }}>Predio</SortableHeader>
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader field="municipio" currentSort={sort} currentOrder={order} basePath="/intervenciones" searchParams={{ componente: componente ?? undefined, accion: accion ?? undefined }}>Municipio</SortableHeader>
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader field="componente" currentSort={sort} currentOrder={order} basePath="/intervenciones" searchParams={{ componente: componente ?? undefined, accion: accion ?? undefined }}>Componente</SortableHeader>
                  </th>
                  <th className="px-4 py-3" title="AJUSTE 5: alarmas activas">
                    Alarmas
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader field="estado" currentSort={sort} currentOrder={order} basePath="/intervenciones" searchParams={{ componente: componente ?? undefined, accion: accion ?? undefined }}>Estado</SortableHeader>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortableHeader field="avance" currentSort={sort} currentOrder={order} basePath="/intervenciones" searchParams={{ componente: componente ?? undefined, accion: accion ?? undefined }} className="justify-end">Avance</SortableHeader>
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {/* UX-67 (audit 2026-07-24): empty state con icono + accion.
                   Antes <td colSpan> con texto plano. */}
                {intervenciones.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-0">
                      <EmptyState
                        icon={Inbox}
                        eyebrow={componente ?? "Convenio CAR · WWF · Natura"}
                        title="Sin intervenciones registradas"
                        description={
                          componente
                            ? `Aún no hay propuestas del componente ${componente}. Cuando se carguen, aparecerán acá.`
                            : "Cuando se carguen propuestas desde el módulo de importación o el dashboard, aparecerán acá con su avance y estado."
                        }
                        size="sm"
                        action={{ label: "Ir al dashboard", href: "/" }}
                      />
                    </td>
                  </tr>
                )}
                {intervencionesPage.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-outline-variant/30 transition-colors hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-3 font-mono text-on-surface-variant">
                      #{i.id}
                    </td>
                    <td className="px-4 py-3 capitalize text-on-surface">
                      {i.actividad || i.tipo}
                    </td>
                    <td className="px-4 py-3 font-mono text-on-surface">
                      {i.codigoPredio}
                    </td>
                    <td className="px-4 py-3">{i.municipio || "—"}</td>
                    <td className="px-4 py-3">
                      {i.componente && COMPONENT_COLOR[i.componente] ? (
                        <Badge variant={COMPONENT_COLOR[i.componente]}>
                          {i.componenteAccion ?? `${i.componente}${i.accion}`}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {/* AJUSTE 5: icono de prioridad + count badge */}
                      {i.alarmaPrioridad === "ALTA" ? (
                        <span className="inline-flex items-center gap-1 text-error" title="Alarma de prioridad ALTA">
                          <AlertOctagon className="size-4" />
                          {i.alarmaCount && i.alarmaCount > 1 ? (
                            <span className="rounded-full bg-error px-1.5 text-[10px] font-bold text-on-error">{i.alarmaCount}</span>
                          ) : null}
                        </span>
                      ) : i.alarmaPrioridad === "MEDIA" ? (
                        <span className="inline-flex items-center gap-1 text-warning" title="Alarma de prioridad MEDIA">
                          <AlertTriangle className="size-4" />
                          {i.alarmaCount && i.alarmaCount > 1 ? (
                            <span className="rounded-full bg-warning px-1.5 text-[10px] font-bold text-on-warning">{i.alarmaCount}</span>
                          ) : null}
                        </span>
                      ) : i.alarmaPrioridad === "BAJA" ? (
                        <span className="inline-flex items-center gap-1 text-primary" title="Alarma de prioridad BAJA">
                          <AlertCircle className="size-4" />
                          {i.alarmaCount && i.alarmaCount > 1 ? (
                            <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-on-primary">{i.alarmaCount}</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-on-surface-variant/40" title="Sin alarmas activas">
                          <CheckCircle2 className="size-4" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoIntervencionDropdown
                        idPropuesta={i.id}
                        estado={i.estado}
                        canEdit={canEdit}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {i.avance === null || i.avance === undefined ? (
                        <span
                          className="inline-flex items-center rounded-full border border-dashed border-outline-variant px-2 py-0.5 text-[10px] font-mono text-on-surface-variant"
                          title="Esta propuesta no tiene un evento de avance registrado por un gestor."
                        >
                          Avance no registrado
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <div
                            className="h-1.5 w-20 overflow-hidden rounded-full bg-outline-variant/30"
                            role="progressbar"
                            aria-valuenow={i.avance}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className={`h-full rounded-full ${
                                i.avance >= 80
                                  ? "bg-success"
                                  : i.avance >= 50
                                    ? "bg-primary"
                                    : "bg-warning"
                              }`}
                              style={{ width: `${i.avance}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono">
                            {formatDecimal(i.avance, 0)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/intervenciones/${i.id}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-label-lg font-bold text-primary transition-colors hover:bg-primary/10"
                      >
                        Ver <ArrowRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-center text-[11px] text-on-surface-variant">
          {formatInt(conteoTotal)}{" "}
          {conteoTotal === 1 ? "propuesta" : "propuestas"} totales en el filtro
          activo. Listando {intervencionesPage.length} en esta página
          (de {hasNextPage ? "más de " : ""}{formatInt(PAGE_SIZE)} por página).
        </p>
      </div>
    </div>
  );
}