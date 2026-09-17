"use client";

// =============================================================================
// MapLayerDataPanel — muestra la DATA (atributos) de la capa seleccionada.
//
// Al pedir "ver datos" de una capa en el panel de capas, este componente
// fetcha /api/geo?layer=X y lista sus features en una tabla (hasta N filas).
// =============================================================================

import * as React from "react";
import { X, Loader2, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayerMeta {
  url: string;
  title: string;
  cols: Array<{ key: string; label: string; align?: "right" }>;
}

/** Metadata de cada capa: de qué endpoint viene y qué columnas mostrar. */
export const LAYER_DATA_META: Record<string, LayerMeta> = {
  municipios:  { url: "/api/geo?layer=municipios",  title: "Municipios",  cols: [{ key: "nombre", label: "Municipio" }, { key: "departamento", label: "Departamento" }] },
  veredas:     { url: "/api/geo?layer=veredas",     title: "Veredas",     cols: [{ key: "nombre", label: "Vereda" }, { key: "id_municipio", label: "Municipio ID", align: "right" }] },
  predios:     { url: "/api/geo?layer=predios",     title: "Predios",     cols: [{ key: "nombre", label: "Predio" }, { key: "areaHa", label: "Área (ha)", align: "right" }] },
  biomas:      { url: "/api/geo?layer=biomas",      title: "Biomas IAVH", cols: [{ key: "nombre", label: "Bioma" }, { key: "areaHa", label: "Área (ha)", align: "right" }] },
  drenaje_simple: { url: "/api/geo?layer=drenajes",        title: "Drenaje simple", cols: [{ key: "nombre", label: "Nombre" }, { key: "estado", label: "Estado" }] },
  drenaje_doble:  { url: "/api/geo?layer=drenajes_dobles", title: "Drenaje doble",  cols: [{ key: "nombre", label: "Nombre" }, { key: "tipo", label: "Tipo" }] },
  paramos:        { url: "/api/geo?layer=paramos",         title: "Páramos",        cols: [{ key: "nombre", label: "Páramo" }] },
  vias:        { url: "/api/geo?layer=vias",        title: "Vías",        cols: [{ key: "tipo", label: "Tipo" }, { key: "estado", label: "Estado" }] },
  propuestas:  { url: "/api/geo?layer=propuestas",  title: "Intervenciones (líneas)", cols: [{ key: "actividad", label: "Actividad" }, { key: "longitudKm", label: "Longitud (km)", align: "right" }] },
  propuestas_punto:    { url: "/api/geo?layer=propuestas_punto",     title: "Intervenciones (puntos)", cols: [{ key: "nombre", label: "Actividad" }, { key: "tipo", label: "Tipo" }] },
  propuestas_poligono: { url: "/api/geo?layer=propuestas_poligono",  title: "Intervenciones (áreas)", cols: [{ key: "nombre", label: "Actividad" }, { key: "areaHa", label: "Área (ha)", align: "right" }] },
};

const MAX_ROWS = 100;

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("es-CO", { maximumFractionDigits: 2 });
  return String(v);
}

export function MapLayerDataPanel({
  layer,
  onClose,
}: {
  layer: string | null;
  onClose: () => void;
}) {
  const [features, setFeatures] = React.useState<GeoJSON.Feature[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!layer) return;
    const meta = LAYER_DATA_META[layer];
    if (!meta) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFeatures([]);
    (async () => {
      try {
        const r = await fetch(meta.url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as GeoJSON.FeatureCollection;
        if (!cancelled) setFeatures(data.features ?? []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [layer]);

  if (!layer) return null;
  const meta = LAYER_DATA_META[layer];
  if (!meta) return null;

  return (
    <div className="absolute bottom-4 right-4 z-[600] flex max-h-[60vh] w-[28rem] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest/95 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between gap-2 border-b border-outline-variant/40 px-3 py-2">
        <span className="flex items-center gap-2 text-label-lg font-bold text-on-surface">
          <Table2 className="size-4 text-primary" />
          {meta.title}
          {!loading && <span className="text-[11px] font-normal text-on-surface-variant">({features.length})</span>}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar datos de capa"
          className="flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="overflow-auto">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-body-sm text-on-surface-variant">
            <Loader2 className="size-4 animate-spin" /> Cargando…
          </div>
        )}
        {error && <p className="p-4 text-body-sm text-error">Error: {error}</p>}
        {!loading && !error && features.length === 0 && (
          <p className="p-4 text-center text-body-sm text-on-surface-variant">Sin datos.</p>
        )}
        {!loading && !error && features.length > 0 && (
          <table className="w-full border-collapse text-left text-body-sm">
            <thead className="sticky top-0 bg-surface-container-low text-[10px] uppercase tracking-wider text-on-surface-variant">
              <tr>
                {meta.cols.map((c) => (
                  <th key={c.key} className={cn("px-3 py-2 font-semibold", c.align === "right" && "text-right")}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.slice(0, MAX_ROWS).map((f, i) => {
                const p = (f.properties ?? {}) as Record<string, unknown>;
                return (
                  <tr key={i} className="border-b border-outline-variant/30">
                    {meta.cols.map((c) => (
                      <td key={c.key} className={cn("px-3 py-1.5 text-on-surface", c.align === "right" && "text-right font-mono text-[12px]")}>
                        {fmt(p[c.key])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {features.length > MAX_ROWS && (
        <p className="border-t border-outline-variant/40 px-3 py-1.5 text-[10px] text-on-surface-variant">
          Mostrando {MAX_ROWS} de {features.length}.
        </p>
      )}
    </div>
  );
}
