import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2, Search, MapPin, Filter } from "lucide-react";
import Link from "next/link";
import { getPrediosGeoJSON } from "@/lib/repos";
import { getCurrentUser } from "@/lib/auth-guard";
import { formatDecimal } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

const COMPONENT_COLOR: Record<string, "primary" | "secondary" | "tertiary"> = {
  C1: "primary",
  C2: "secondary",
  C3: "tertiary",
};

export default async function PrediosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [params, usuario] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);
  const q = (params.q ?? "").trim().toLowerCase();
  const canEdit = usuario?.rol === "ADMIN" || usuario?.rol === "GESTOR";

  const geojson = await getPrediosGeoJSON();
  const all = geojson.features;

  const filtered = q
    ? all.filter((f) =>
        f.properties.nombre.toLowerCase().includes(q) ||
        f.properties.codigo.toLowerCase().includes(q) ||
        (f.properties.componente ?? "").toLowerCase().includes(q),
      )
    : all;

  // Calcular KPIs
  const totalArea = all.reduce((acc, f) => acc + (f.properties.areaHa || 0), 0);
  const porComponente = all.reduce<Record<string, number>>((acc, f) => {
    const c = f.properties.componente ?? "—";
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});

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
                <h1 className="text-2xl font-bold text-on-surface">
                  Predios
                </h1>
                <p className="text-body-sm text-on-surface-variant">
                  {all.length} predios registrados · {formatDecimal(totalArea, 1)} ha totales
                </p>
              </div>
            </div>
          </div>
          {canEdit && (
            <Button asChild>
              <Link href="/predios/nuevo">
                + Nuevo Predio
              </Link>
            </Button>
          )}
        </div>

        {/* KPI chips por componente */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-[10px] font-bold uppercase text-on-surface-variant">
              Total predios
            </p>
            <p className="mt-1 text-2xl font-bold text-on-surface">
              {all.length}
            </p>
          </Card>
          {(["C1", "C2", "C3"] as const).map((c) => (
            <Card key={c} className="p-4">
              <p className="text-[10px] font-bold uppercase text-on-surface-variant">
                {c}
              </p>
              <p
                className={
                  "mt-1 text-2xl font-bold " +
                  (c === "C1"
                    ? "text-primary"
                    : c === "C2"
                    ? "text-secondary"
                    : "text-tertiary")
                }
              >
                {porComponente[c] ?? 0}
              </p>
            </Card>
          ))}
        </div>

        {/* Tabla */}
        <Card className="overflow-hidden">
          {/* Buscador + filtros */}
          <div className="flex flex-col gap-3 border-b border-outline-variant p-4 sm:flex-row sm:items-center sm:justify-between">
            <form className="relative flex w-full max-w-sm items-center">
              <Search className="absolute left-3 size-4 text-on-surface-variant" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Buscar por nombre, código o componente…"
                className="pl-9"
              />
            </form>
            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
              <Filter className="size-4" />
              <span>
                Mostrando{" "}
                <span className="font-bold text-on-surface">
                  {filtered.length}
                </span>{" "}
                de {all.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-body-sm">
              <thead>
                <tr className="bg-surface-container-low text-[11px] font-bold uppercase text-on-surface-variant">
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Componente</th>
                  <th className="px-4 py-3 text-right">Área (ha)</th>
                  <th className="px-4 py-3 text-right">Lat / Lon</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {/* UX-67 (audit 2026-07-24): empty state con icono + accion.
                   Antes era <tr> con <td colSpan> + texto plano. Ahora
                   EmptyState component (reusable). */}
                {filtered.length === 0 && all.length > 0 && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <EmptyState
                        icon={Search}
                        title="Sin coincidencias"
                        description={`No hay predios que coincidan con "${q}". Probá limpiar el filtro o usar otro término.`}
                        size="sm"
                        action={{ label: "Limpiar filtro", href: "/predios" }}
                      />
                    </td>
                  </tr>
                )}
                {filtered.length === 0 && all.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-0">
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
                {filtered.map((f) => (
                  <tr
                    key={f.properties.id}
                    className="border-b border-outline-variant/30 transition-colors hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-3 font-mono text-on-surface">
                      {f.properties.codigo}
                    </td>
                    <td className="px-4 py-3 font-bold text-on-surface">
                      {f.properties.nombre}
                    </td>
                    <td className="px-4 py-3">
                      {f.properties.componente &&
                      COMPONENT_COLOR[f.properties.componente] ? (
                        <Badge
                          variant={
                            COMPONENT_COLOR[f.properties.componente]
                          }
                        >
                          {f.properties.componente}
                        </Badge>
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatDecimal(f.properties.areaHa, 2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-on-surface-variant">
                      {f.geometry.coordinates[1].toFixed(4)},{" "}
                      {f.geometry.coordinates[0].toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/predios/${f.properties.id}`}
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