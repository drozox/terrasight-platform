"use client";

// =============================================================================
// MapFeaturePanel — atributos completos de la entidad clickeada en el mapa.
// Da la experiencia SIG: click → tabla de todos los campos + link a la ficha.
// =============================================================================

import * as React from "react";
import Link from "next/link";
import { X, ExternalLink, Info } from "lucide-react";

const LABELS: Record<string, string> = {
  id: "ID", nombre: "Nombre", areaHa: "Área (ha)", longitudKm: "Longitud (km)",
  tipo: "Tipo", estado: "Estado", departamento: "Departamento",
  id_municipio: "Municipio (ID)", actividad: "Actividad",
};

const LAYER_TITLE: Record<string, string> = {
  municipios: "Municipio", veredas: "Vereda", predios: "Predio", biomas: "Bioma",
  drenajes: "Drenaje / Quebrada", vias: "Vía",
  propuestas: "Intervención (línea)", propuestas_punto: "Intervención (punto)",
  propuestas_poligono: "Intervención (área)",
};

function human(k: string) {
  return LABELS[k] ?? k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
}
function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("es-CO", { maximumFractionDigits: 2 });
  return String(v);
}

export function MapFeaturePanel({
  feature,
  onClose,
}: {
  feature: GeoJSON.Feature | null;
  onClose: () => void;
}) {
  if (!feature) return null;
  const p = (feature.properties ?? {}) as Record<string, unknown>;
  const layer = String(p.layer ?? "");
  const id = p.id;
  const href =
    layer === "predios"
      ? `/predios/${id}`
      : layer.startsWith("propuestas")
        ? `/intervenciones/${id}`
        : null;

  const entries = Object.entries(p).filter(([k]) => k !== "layer");
  const nombre = (p.nombre as string) ?? (p.actividad as string) ?? `#${id ?? ""}`;

  return (
    <div className="absolute right-4 top-4 z-[700] flex max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container-lowest/98 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-2 border-b border-outline-variant/40 px-3 py-2.5">
        <div className="flex min-w-0 items-start gap-2">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              {LAYER_TITLE[layer] ?? "Entidad"}
            </p>
            <p className="truncate text-sm font-bold text-on-surface" title={String(nombre)}>
              {String(nombre)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar atributos"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="overflow-y-auto px-3 py-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm">
          {entries.map(([k, v]) => (
            <React.Fragment key={k}>
              <dt className="text-on-surface-variant">{human(k)}</dt>
              <dd className="break-words font-medium text-on-surface">{fmt(v)}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>

      {href && (
        <div className="border-t border-outline-variant/40 px-3 py-2">
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-label-lg font-bold text-primary hover:underline"
          >
            Ver ficha completa <ExternalLink className="size-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
