"use client";

// =============================================================================
// MonitoreoMap — vista mapa del módulo de monitoreo (HU-MO-01).
//
// Renderiza los puntos como marcadores de `react-leaflet` con un ícono
// coloreado por `tipoPunto`. Replica el patrón de `mapa-mini.tsx` de
// intervenciones: reusa el bundle de react-leaflet directo, sin pasar por
// el `LeafletMap` global de la home.
// =============================================================================

import * as React from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
} from "react-leaflet";
import { Loader2, MapPin } from "lucide-react";
import { TIPO_PUNTO_LABEL, type MonitoreoPunto, type TipoPunto } from "@/lib/repository";

// -----------------------------------------------------------------------------
// Constantes y helpers
// -----------------------------------------------------------------------------
const CUNDINAMARCA_CENTER: [number, number] = [4.92, -73.93];

// Colores del mapa por tipo (mismo mapping que el badge del módulo).
const TIPO_PUNTO_HEX: Record<TipoPunto, { fill: string; stroke: string }> = {
  obra_captacion:      { fill: "#006d37", stroke: "#00391a" }, // primary
  estacion_limnimetrica:{ fill: "#1f79b9", stroke: "#0c4a78" }, // info
  bebedero:            { fill: "#ab47bc", stroke: "#6a1b9a" }, // secondary
  tanque:              { fill: "#6a8caf", stroke: "#39506a" }, // tertiary
  panel_solar:         { fill: "#c77700", stroke: "#7a4a00" }, // warning
};

function computeBounds(
  puntos: MonitoreoPunto[],
): { center: [number, number]; zoom: number } {
  const visibles = puntos.filter((p) => p.lat !== null && p.lon !== null);
  if (visibles.length === 0) {
    return { center: CUNDINAMARCA_CENTER, zoom: 11 };
  }
  if (visibles.length === 1) {
    const p = visibles[0]!;
    return { center: [p.lat!, p.lon!], zoom: 14 };
  }
  let minLat = visibles[0]!.lat!;
  let maxLat = visibles[0]!.lat!;
  let minLon = visibles[0]!.lon!;
  let maxLon = visibles[0]!.lon!;
  for (const p of visibles) {
    if (p.lat! < minLat) minLat = p.lat!;
    if (p.lat! > maxLat) maxLat = p.lat!;
    if (p.lon! < minLon) minLon = p.lon!;
    if (p.lon! > maxLon) maxLon = p.lon!;
  }
  const center: [number, number] = [(minLat + maxLat) / 2, (minLon + maxLon) / 2];
  const diag = Math.hypot(maxLon - minLon, maxLat - minLat);
  let zoom: number;
  if (diag > 2) zoom = 8;
  else if (diag > 0.5) zoom = 10;
  else if (diag > 0.1) zoom = 12;
  else if (diag > 0.01) zoom = 13;
  else zoom = 14;
  return { center, zoom };
}

// -----------------------------------------------------------------------------
// Ícono inline — un teardrop con el color del tipo + el icono Lucide dentro.
// Usamos SVG inline para evitar el bug "marker icon not found" del bundler.
// -----------------------------------------------------------------------------
function buildIcon(tipo: TipoPunto): L.DivIcon {
  const { fill, stroke } = TIPO_PUNTO_HEX[tipo];
  const icon = iconForTipo(tipo);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 24 16 24s16-13 16-24c0-8.8-7.2-16-16-16z"
            fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
      <g transform="translate(8 6) scale(0.67)" fill="#ffffff" stroke="none">
        ${icon}
      </g>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "terrasight-monitoreo-marker",
    iconSize: [22, 28],
    iconAnchor: [11, 28],
    popupAnchor: [0, -26],
  });
}

function iconForTipo(tipo: TipoPunto): string {
  // Paths simplificados de los iconos Lucide (24x24).
  // Mantenerlos en sync con `lucide-react` no es crítico — solo se usan
  // como decoración visual dentro del marker.
  switch (tipo) {
    case "obra_captacion":
      return `<path d="M12 2.5C8 8.5 5 12.5 5 16a7 7 0 0 0 14 0c0-3.5-3-7.5-7-13.5z"/>`; // Droplet
    case "estacion_limnimetrica":
      return `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`; // Activity
    case "bebedero":
      return `<path d="M4.5 3h15l-1.5 15a3 3 0 0 1-3 2.5h-6a3 3 0 0 1-3-2.5L4.5 3z M9 3V2 M15 3V2"/>`; // Beaker
    case "tanque":
      return `<path d="M21 8 12 3 3 8v8l9 5 9-5V8z M3.3 7 12 12l8.7-5 M12 22V12"/>`; // Box
    case "panel_solar":
      return `<circle cx="12" cy="12" r="4"/><path d="M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2 M4.93 19.07l1.41-1.41 M17.66 6.34l1.41-1.41"/>`; // Sun
  }
}

// -----------------------------------------------------------------------------
// Shell del mapa (cargado solo en cliente).
// -----------------------------------------------------------------------------
function MonitoreoMapShell({ puntos }: { puntos: MonitoreoPunto[] }) {
  const { center, zoom } = React.useMemo(() => computeBounds(puntos), [puntos]);

  // Si no hay puntos georreferenciados, mostramos placeholder.
  if (puntos.length === 0) {
    return (
      <div className="flex h-[500px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low text-center text-on-surface-variant">
        <MapPin className="mb-2 size-8 opacity-40" />
        <p className="text-body-sm font-semibold">Sin puntos georreferenciados</p>
        <p className="mt-1 text-[11px]">
          No hay puntos con coordenadas geográficas en el filtro actual.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[500px] w-full overflow-hidden rounded-xl">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        zoomControl={false}
        className="h-full w-full"
        style={{ background: "#cee5d8" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap"
        />
        <ZoomControl position="topright" />

        {puntos.map((p) => {
          const icon = buildIcon(p.tipoPunto);
          return (
            <Marker
              key={p.idPropPunto}
              position={[p.lat!, p.lon!]}
              icon={icon}
            >
              <Popup>
                <div className="font-sans text-xs">
                  <strong className="mb-1 block text-sm text-on-surface">
                    {p.actividad}
                  </strong>
                  <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold text-on-surface">
                    {TIPO_PUNTO_LABEL[p.tipoPunto]}
                  </div>
                  <div className="space-y-0.5 border-t border-outline-variant pt-1.5 text-on-surface-variant">
                    <div>
                      <span className="font-bold">Componente:</span>{" "}
                      {p.nombreComponente} · {p.nombreAccion}
                    </div>
                    <div>
                      <span className="font-bold">Predio:</span>{" "}
                      <a
                        href={`/predios/${p.idPredio}`}
                        className="text-primary hover:underline"
                      >
                        {p.codigoPredio}
                      </a>{" "}
                      {p.nombrePredio}
                    </div>
                    {p.nombreMunicipio && (
                      <div>
                        <span className="font-bold">Municipio:</span>{" "}
                        {p.nombreMunicipio}
                      </div>
                    )}
                    <div>
                      <span className="font-bold">Beneficiarios:</span>{" "}
                      {p.totalBeneficiarios}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Public component — wrapper con `dynamic(..., { ssr: false })`.
// -----------------------------------------------------------------------------
const MonitoreoMapClient = dynamic(() => Promise.resolve(MonitoreoMapShell), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-xl bg-surface-variant text-sm text-on-surface-variant">
      <Loader2 className="mr-2 size-4 animate-spin" />
      Cargando mapa…
    </div>
  ),
});

export function MonitoreoMap({ puntos }: { puntos: MonitoreoPunto[] }) {
  return <MonitoreoMapClient puntos={puntos} />;
}
