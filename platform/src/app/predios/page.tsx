// =============================================================================
// /predios — Lista de predios concertados (DEEPSEEK-F3 / F3.2).
// Cambios vs versión anterior:
//   - Filtros por ?componente=Cx y ?accion=CxAy (código canónico, no A1/A2 suelto)
//   - Componente/acción derivados de las propuestas del predio (no de nucleo)
//   - Columna "Propietario" con nombre (no solo ID)
//   - Tabla: Componente = código completo (C1A1..C3AU) + columna Acción (A1/A2/AU)
//   - KPI chips: Total / C1 / C3 (C2 no acota por predios)
//   - Cédula anterior → "Cédula ANT" (Agencia Nacional de Tierras)
// =============================================================================

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Building2, Search, MapPin, Filter } from "lucide-react";
import Link from "next/link";
import { listPrediosFiltrados, getPrediosKpis } from "@/lib/repos";
import { getCurrentUser } from "@/lib/auth-guard";
import { formatDecimal } from "@/lib/utils";
import {
  accionesDeComponente,
  normalizarAccion,
  type AccionCode,
} from "@/lib/acciones";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  componente?: string;
  accion?: string;
  sort?: string;
  order?: "asc" | "desc";
}>;

const COMPONENT_COLOR: Record<string, "primary" | "secondary" | "tertiary"> = {
  C1: "primary",
  C2: "secondary",
  C3: "tertiary",
};

// DEEPSEEK-F3: C2 no acota por predios (acota por microcuencas), lo excluimos
// del KPI chip y de los filtros de la tabla.
const COMPONENTES_PREDIOS = ["C1", "C3"] as const;

export default async function PrediosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const componente = params.componente ?? null;
  const accionCode = normalizarAccion(params.accion);
  const sort = params.sort ?? "nombre";
  const order = params.order === "desc" ? "desc" : "asc";

  const [all, kpis, usuario] = await Promise.all([
    listPrediosFiltrados({ componente, accion: accionCode, q: q || null }),
    getPrediosKpis(),
    getCurrentUser(),
  ]);
  const canEdit = usuario?.rol === "ADMIN" || usuario?.rol === "GESTOR";

  const sorted = [...all].sort((a, b) => {
    const fieldMap: Record<string, string> = {
      codigo: "codigo",
      nombre: "nombrePredio",
      propietario: "nombrePropietario",
      componente: "codigoAccion",
      accion: "accionLabel",
      nucleo: "nucleoPredial",
      area: "areaHa",
    };
    const key = fieldMap[sort] ?? "nombrePredio";
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

  const acciones =
    componente && (COMPONENTES_PREDIOS as readonly string[]).includes(componente)
      ? accionesDeComponente(componente)
      : [];

  const kpisChips = [
    { label: "Total predios", value: kpis.total, color: "text-on-surface" },
    { label: "C1", value: kpis.c1, color: "text-primary" },
    { label: "C3", value: kpis.c3, color: "text-tertiary" },
  ];

  const sortParams = {
    q,
    componente: componente ?? undefined,
    accion: accionCode ?? undefined,
  };

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-7xl flex-col gap-gutter">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-on-surface">Predios</h1>
                <p className="text-body-sm text-on-surface-variant">
                  {all.length} predios listados · {formatDecimal(
                    all.reduce((acc, p) => acc + (p.areaHa ?? 0), 0),
                    1,
                  )}{" "}
                  ha
                  {(componente || accionCode) && (
                    <>
                      {" · Filtro: "}
                      {componente ?? "—"}
                      {accionCode ? ` — ${accionCode}` : ""}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
          {canEdit && (
            <Button asChild>
              <Link href="/predios/nuevo">+ Nuevo Predio</Link>
            </Button>
          )}
        </div>

        {/* KPI chips (Total / C1 / C3) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {kpisChips.map((c) => (
            <Card key={c.label} className="p-4">
              <p className="text-[10px] font-bold uppercase text-on-surface-variant">
                {c.label}
              </p>
              <p className={"mt-1 text-2xl font-bold " + c.color}>{c.value}</p>
            </Card>
          ))}
        </div>

        {/* Chips de filtro por componente */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/predios"
            className={`rounded-full border px-3 py-1 text-label-lg font-bold transition-colors ${
              !componente
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant"
            }`}
          >
            Todos
          </Link>
          {COMPONENTES_PREDIOS.map((c) => (
            <Link
              key={c}
              href={`/predios?componente=${c}`}
              className={`rounded-full border px-3 py-1 text-label-lg font-bold transition-colors ${
                componente === c
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant"
              }`}
            >
              {c}
            </Link>
          ))}
        </div>

        {/* Chips de acción (solo si hay componente con acciones) */}
        {componente && acciones.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label-lg font-bold text-on-surface-variant">
              Acción:
            </span>
            <Link
              href={`/predios?componente=${componente}`}
              className={`rounded-full border px-3 py-1 text-label-lg font-bold transition-colors ${
                !accionCode
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant"
              }`}
            >
              Todas
            </Link>
            {acciones.map((a) => (
              <Link
                key={a.code}
                href={`/predios?componente=${componente}&accion=${a.code}`}
                className={`rounded-full border px-3 py-1 text-label-lg font-bold transition-colors ${
                  accionCode === a.code
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                {a.code}
              </Link>
            ))}
          </div>
        )}

        {/* Tabla */}
        <Card className="overflow-hidden">
          {/* Buscador */}
          <div className="flex flex-col gap-3 border-b border-outline-variant p-4 sm:flex-row sm:items-center sm:justify-between">
            <form className="relative flex w-full max-w-sm items-center">
              <Search className="absolute left-3 size-4 text-on-surface-variant" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Buscar por nombre, código, cédula o propietario…"
                className="pl-9"
              />
              {/* Preservar filtros de componente/accion al buscar */}
              {componente && <input type="hidden" name="componente" value={componente} />}
              {accionCode && <input type="hidden" name="accion" value={accionCode} />}
            </form>
            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
              <Filter className="size-4" />
              <span>
                Mostrando{" "}
                <span className="font-bold text-on-surface">{sorted.length}</span>{" "}
                de {all.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-body-sm">
              <thead>
                <tr className="bg-surface-container-low text-[11px] font-bold uppercase text-on-surface-variant">
                  <th className="px-4 py-3">
                    <SortableHeader field="codigo" currentSort={sort} currentOrder={order} basePath="/predios" searchParams={sortParams}>
                      Código
                    </SortableHeader>
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader field="nombre" currentSort={sort} currentOrder={order} basePath="/predios" searchParams={sortParams}>
                      Nombre
                    </SortableHeader>
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader field="propietario" currentSort={sort} currentOrder={order} basePath="/predios" searchParams={sortParams}>
                      Propietario
                    </SortableHeader>
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader field="componente" currentSort={sort} currentOrder={order} basePath="/predios" searchParams={sortParams}>
                      Componente
                    </SortableHeader>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortableHeader
                      field="area"
                      currentSort={sort}
                      currentOrder={order}
                      basePath="/predios"
                      searchParams={sortParams}
                      className="justify-end"
                    >
                      Área (ha)
                    </SortableHeader>
                  </th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && kpis.total > 0 && (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <EmptyState
                        icon={Search}
                        title="Sin coincidencias"
                        description="No hay predios que coincidan con los filtros aplicados. Probá limpiar los filtros."
                        size="sm"
                        action={{ label: "Limpiar filtros", href: "/predios" }}
                      />
                    </td>
                  </tr>
                )}
                {sorted.length === 0 && kpis.total === 0 && (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <EmptyState
                        icon={Building2}
                        title="Sin predios registrados"
                        description="Aún no hay predios del convenio cargados. Empezá creando uno nuevo."
                        size="md"
                        action={
                          canEdit
                            ? { label: "+ Crear primer predio", href: "/predios/nuevo" }
                            : { label: "Ir al mapa", href: "/mapa" }
                        }
                      />
                    </td>
                  </tr>
                )}
                {sorted.map((p) => (
                  <tr
                    key={p.idPredio}
                    className="border-b border-outline-variant/30 transition-colors hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-3 font-mono text-on-surface">
                      {p.codigo}
                    </td>
                    <td className="px-4 py-3 font-bold text-on-surface">
                      {p.nombrePredio}
                    </td>
                    <td className="px-4 py-3 text-on-surface">
                      {p.nombrePropietario || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.codigoAccion && p.componente && COMPONENT_COLOR[p.componente] ? (
                        <Badge variant={COMPONENT_COLOR[p.componente]}>
                          {p.codigoAccion}
                        </Badge>
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatDecimal(p.areaHa, 2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/predios/${p.idPredio}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-label-lg font-bold text-primary transition-colors hover:bg-primary/10"
                      >
                        <MapPin className="size-3.5" />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Note */}
        <p className="text-center text-[11px] text-on-surface-variant">
          {canEdit
            ? "Edición disponible — alta, baja y modificación de registros."
            : "Modo lectura: tu rol no permite editar predios."}
        </p>
      </div>
    </div>
  );
}
