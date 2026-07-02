import Link from "next/link";
import { Bell, AlertTriangle, AlertCircle, Info, MapPin, CheckCircle2, Filter, X, MapPinned } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAlertas, getPrediosGeoJSON } from "@/lib/repository";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ tipo?: string }>;

const TIPO_META: Record<
  string,
  { label: string; icon: typeof AlertTriangle; color: string; ring: string; bg: string; chip: string }
> = {
  error: {
    label: "Crítica",
    icon: AlertCircle,
    color: "text-error",
    ring: "ring-error/40",
    bg: "bg-error/5",
    chip: "bg-error/15 text-error",
  },
  warning: {
    label: "Advertencia",
    icon: AlertTriangle,
    color: "text-warning",
    ring: "ring-warning/40",
    bg: "bg-warning/5",
    chip: "bg-warning/15 text-warning",
  },
  info: {
    label: "Informativa",
    icon: Info,
    color: "text-info",
    ring: "ring-info/40",
    bg: "bg-info/5",
    chip: "bg-info/15 text-info",
  },
};

export default async function AlertasPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filtro = (params.tipo ?? "todas").toLowerCase();

  const all = await getAlertas();
  const filtered =
    filtro === "todas" ? all : all.filter((a) => a.tipo.toLowerCase() === filtro);

  const counts = {
    todas: all.length,
    error: all.filter((a) => a.tipo === "error").length,
    warning: all.filter((a) => a.tipo === "warning").length,
    info: all.filter((a) => a.tipo === "info").length,
  };

  // Único predio cargado (para que el botón "Ver en mapa" tenga destino)
  const geojson = await getPrediosGeoJSON();
  const primerPredio = geojson.features[0];

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-7xl flex-col gap-gutter">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error/10 text-error">
              <Bell className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">
                Alertas y Notificaciones
              </h1>
              <p className="text-body-sm text-on-surface-variant">
                {all.length} alertas registradas · {counts.error} críticas ·{" "}
                {counts.warning} advertencias · {counts.info} informativas
              </p>
            </div>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/">← Volver al dashboard</Link>
          </Button>
        </div>

        {/* Chips de filtro */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
              <Filter className="size-4" />
              <span className="font-bold uppercase text-[11px]">Filtrar por tipo</span>
            </div>
            {(["todas", "error", "warning", "info"] as const).map((t) => {
              const isActive = filtro === t;
              const meta = t === "todas"
                ? { label: "Todas", icon: Bell, color: "text-on-surface", ring: "ring-primary/40", bg: "bg-primary/10", chip: "bg-primary/15 text-primary" }
                : TIPO_META[t];
              const Icon = meta.icon;
              const count = counts[t as keyof typeof counts];
              return (
                <Link
                  key={t}
                  href={t === "todas" ? "/alertas" : `/alertas?tipo=${t}`}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-label-lg font-bold uppercase transition-all",
                    isActive
                      ? `${meta.chip} ring-2 ${meta.ring} border-transparent`
                      : "border-outline-variant text-on-surface-variant hover:border-outline hover:bg-surface-container-low",
                  )}
                >
                  <Icon className="size-4" />
                  {meta.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-bold",
                      isActive ? "bg-surface-container-lowest/80" : "bg-surface-container-low",
                    )}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Lista */}
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h3 className="mt-4 text-lg font-bold text-on-surface">
              Sin alertas {filtro === "todas" ? "" : `de tipo ${filtro}`}
            </h3>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              No se encontraron notificaciones con este filtro.
            </p>
          </Card>
        ) : (
          <div className="grid gap-gutter">
            {filtered.map((a) => {
              const meta = TIPO_META[a.tipo];
              const Icon = meta.icon;
              return (
                <Card
                  key={a.id}
                  className={cn(
                    "overflow-hidden border-l-4 transition-shadow hover:shadow-md",
                    a.tipo === "error"   && "border-l-error",
                    a.tipo === "warning" && "border-l-warning",
                    a.tipo === "info"    && "border-l-info",
                  )}
                >
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                      <div
                        className={cn(
                          "flex size-10 flex-shrink-0 items-center justify-center rounded-lg",
                          meta.bg,
                          meta.color,
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-on-surface">
                            {a.titulo}
                          </h3>
                          <Badge variant={a.tipo === "error" ? "error" : a.tipo === "warning" ? "warning" : "info"}>
                            {meta.label}
                          </Badge>
                          <span className="text-[11px] text-on-surface-variant">
                            · {a.fecha}
                          </span>
                        </div>
                        <p className="text-body-sm leading-relaxed text-on-surface-variant">
                          {a.descripcion}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {primerPredio && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/?componente=${primerPredio.properties.componente ?? ""}`}>
                            <MapPinned className="size-4" />
                            Ver en mapa
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <X className="size-4" />
                        Descartar
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-center text-[11px] text-on-surface-variant">
          Las alertas se generan desde el sistema de monitoreo ambiental (sensor
          remoto + post-proceso). Próxima fase: integraciones IoT y umbrales
          configurables por usuario.
        </p>
      </div>
    </div>
  );
}
