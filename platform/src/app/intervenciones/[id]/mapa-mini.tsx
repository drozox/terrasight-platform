"use client";

// =============================================================================
// Mapa mini para la ficha de intervención (HU-IC-03).
//
// Renderiza la geometría de la intervención en un LeafletMap compacto:
//   - punto:    Marker con el icono de la app.
//   - linea:    Polyline coloreada (primary).
//   - poligono: Polygon coloreado (primary) con fill.
//
// Si no hay geometría, muestra un placeholder centrado en Cundinamarca.
//
// Usa `react-leaflet@5` directo (no el `LeafletMap` de la home — ese filtra
// por componente y no es reutilizable para geometrías arbitrarias).
// =============================================================================

import * as React from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Polygon,
} from "react-leaflet";
import { MapPin, Loader2 } from "lucide-react";
import type {
  IntervencionCompleta,
  GeoJSONLineString,
  GeoJSONMultiLineString,
  GeoJSONPolygon,
  GeoJSONMultiPolygon,
} from "@/lib/types";
import { centerAndZoomFromCoords } from "@/lib/geo/centroid";
import type { IntervencionContexto, VecinoMini } from "@/lib/repos/propuestas";

// -----------------------------------------------------------------------------
// Centroid por tipo de geometría
// -----------------------------------------------------------------------------
const CUNDINAMARCA_CENTER: [number, number] = [4.92, -73.93];

function computeCentroid(
  intervencion: IntervencionCompleta,
  _contexto: IntervencionContexto | null = null,
): { center: [number, number]; zoom: number } {
  // El encuadre debe mostrar SIEMPRE la intervención actual. Las vecinas se
  // dibujan como contexto, pero NO entran en el cálculo del centro/zoom: si una
  // vecina cae lejos, la geometría principal quedaba fuera de vista (o diminuta).
  if (intervencion.tipo === "punto" && intervencion.geom) {
    return {
      center: [intervencion.geom.lat, intervencion.geom.lon],
      zoom: 14,
    };
  }
  if (intervencion.tipo === "linea" && intervencion.geom) {
    return centerAndZoomFromCoords(intervencion.geom.geojson.coordinates, {
      center: CUNDINAMARCA_CENTER,
      zoom: 13,
    });
  }
  if (intervencion.tipo === "poligono" && intervencion.geom) {
    return centerAndZoomFromCoords(intervencion.geom.geojson.coordinates, {
      center: CUNDINAMARCA_CENTER,
      zoom: 13,
    });
  }
  return { center: CUNDINAMARCA_CENTER, zoom: 11 };
}

// -----------------------------------------------------------------------------
// Icon inline para puntos (evita el bug "marker icon not found" del bundler).
// -----------------------------------------------------------------------------
const ICON_INTERVENCION = L.icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 24 16 24s16-13 16-24c0-8.8-7.2-16-16-16z"
            fill="#2f6388" stroke="#001e30" stroke-width="1.5"/>
      <circle cx="16" cy="16" r="6" fill="#FFFFFF"/>
    </svg>
  `),
  iconSize: [22, 28],
  iconAnchor: [11, 28],
  popupAnchor: [0, -26],
});

// AJUSTE 3: icono tenue para vecinos (mismo componente/accion en municipio).
const ICON_VECINO = L.icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 24 16 24s16-13 16-24c0-8.8-7.2-16-16-16z"
        fill="#9ca3af" stroke="#374151" stroke-width="1"/>
      <circle cx="16" cy="16" r="4" fill="#FFFFFF"/>
    </svg>
  `),
  iconSize: [16, 20],
  iconAnchor: [8, 20],
  popupAnchor: [0, -18],
});

// AJUSTE 3: helpers para extraer coordenadas de GeoJSON heterogeneo.
type LngLat = [number, number];
type LngLatRing = LngLat[];
type LngLatPolygonCoords = LngLatRing[];

function isGeometryPolygon(g: GeoJSON.Geometry): g is GeoJSON.Polygon | GeoJSON.MultiPolygon {
  return g.type === "Polygon" || g.type === "MultiPolygon";
}

function isGeometryPoint(g: GeoJSON.Geometry): g is GeoJSON.Point {
  return g.type === "Point";
}

function isGeometryLineOrPolygon(
  g: GeoJSON.Geometry,
): g is GeoJSON.LineString | GeoJSON.MultiLineString | GeoJSON.Polygon | GeoJSON.MultiPolygon {
  return (
    g.type === "LineString" ||
    g.type === "MultiLineString" ||
    g.type === "Polygon" ||
    g.type === "MultiPolygon"
  );
}

/** Aplana un Polygon / MultiPolygon a un anillo de LngLat (Polygon toma el 1er anillo). */
function extractCoordinates(g: GeoJSON.Geometry): LngLat[] {
  if (g.type === "Point") {
    const c = (g as GeoJSON.Point).coordinates as number[];
    return [[c[0] ?? 0, c[1] ?? 0]];
  }
  if (g.type === "LineString") {
    return ((g as GeoJSON.LineString).coordinates as number[][]).map((c) => [c[0] ?? 0, c[1] ?? 0]);
  }
  if (g.type === "MultiLineString") {
    return (((g as GeoJSON.MultiLineString).coordinates as number[][][])[0] ?? []).map(
      (c) => [c[0] ?? 0, c[1] ?? 0],
    );
  }
  if (g.type === "Polygon") {
    return ((g as GeoJSON.Polygon).coordinates as number[][][])[0].map(
      (c) => [c[0] ?? 0, c[1] ?? 0],
    );
  }
  if (g.type === "MultiPolygon") {
    const first = ((g as GeoJSON.MultiPolygon).coordinates as number[][][][])[0];
    if (!first) return [];
    return first[0].map((c) => [c[0] ?? 0, c[1] ?? 0]);
  }
  return [];
}

/** Construye un FeatureCollection a partir de vecinos que tengan geometría planar
 *  (lineas + polígonos), descartando puntos (estos se renderizan con Marker). */
function geoJsonCollectionFromVecinos(
  vecinos: VecinoMini[],
  _style: L.PathOptions,
): GeoJSON.FeatureCollection | null {
  const features: GeoJSON.Feature[] = [];
  for (const v of vecinos) {
    if (v.tipo === "punto") continue;
    if (!isGeometryLineOrPolygon(v.geom)) continue;
    features.push({
      type: "Feature",
      id: v.id,
      geometry: v.geom,
      properties: { id: v.id, tipo: v.tipo, actividad: v.actividad },
    });
  }
  if (features.length === 0) return null;
  return { type: "FeatureCollection", features };
}

// -----------------------------------------------------------------------------
// Props del shell — recibe la intervención completa del page.tsx y el contexto.
// -----------------------------------------------------------------------------
function MapaMiniShell({
  intervencion,
  contexto,
}: {
  intervencion: IntervencionCompleta;
  contexto: IntervencionContexto | null;
}) {
  const [showContext, setShowContext] = React.useState(true);
  const vecinos: VecinoMini[] =
    showContext && contexto ? contexto.vecinos : [];

  const { center, zoom } = computeCentroid(
    intervencion,
    showContext ? contexto : null,
  );

  // GeoJSON data — construida según el tipo.
  const data = React.useMemo(() => {
    if (intervencion.tipo === "linea" && intervencion.geom) {
      return lineaToFeature(intervencion.geom.geojson, intervencion.id);
    }
    if (intervencion.tipo === "poligono" && intervencion.geom) {
      return poligonoToFeature(intervencion.geom.geojson, intervencion.id);
    }
    return null;
  }, [intervencion]);

  const style = React.useCallback(
    (): L.PathOptions => ({
      color: "#006d37", // primary
      weight: 3,
      fillColor: "#006d37",
      fillOpacity: 0.18,
    }),
    [],
  );

  // Estilo del contexto (predio + vecinos): lineas tenues + poligonos con fill suave.
  const predioStyle: L.PathOptions = {
    color: "#404040",
    weight: 1,
    fillColor: "#cccccc",
    fillOpacity: 0.06,
    dashArray: "4 3",
  };
  const vecinoGeoStyle: L.PathOptions = {
    color: "#888888",
    weight: 1.5,
    fillColor: "#bbbbbb",
    fillOpacity: 0.18,
    dashArray: "2 2",
  };

  // Helpers GeoJSON — colecciones por tipo (omitimos Point que se renderiza con Marker).
  const vecinosLineasFC = React.useMemo(
    () =>
      geoJsonCollectionFromVecinos(
        vecinos.filter((v) => v.tipo !== "punto"),
        vecinoGeoStyle,
      ),
    [vecinos],
  );

  const canRenderMain =
    (intervencion.tipo === "punto" && intervencion.geom) || data;

  return (
    <div className="space-y-2">
      {/* Toggle: Mostrar/ocultar contexto (AJUSTE 3). */}
      {contexto && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-on-surface-variant">
            {contexto.vecinos.length > 0
              ? `Mostrando esta intervención y ${contexto.vecinos.length} ${contexto.vecinos.length === 1 ? "vecina del mismo" : "vecinas del mismo"} ${contexto.componenteAccion ?? "componente/acción"} en el municipio.`
              : `Esta intervención no tiene vecinas del mismo ${contexto.componenteAccion ?? "componente/acción"} en el municipio.`}
          </p>
          <button
            type="button"
            onClick={() => setShowContext((s) => !s)}
            aria-pressed={showContext}
            className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-[11px] font-bold text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            {showContext ? "Ocultar contexto" : "Mostrar contexto"}
          </button>
        </div>
      )}

      <div className="relative h-72 w-full overflow-hidden rounded-xl">
        {canRenderMain ? (
          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={false}
            zoomControl={true}
            className="h-full w-full"
            style={{ background: "#cee5d8" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap"
            />

            {/* Poligono del predio (AJUSTE 3). */}
            {showContext && contexto?.predioGeom &&
              isGeometryPolygon(contexto.predioGeom) && (
                <Polygon
                  positions={extractCoordinates(contexto.predioGeom)}
                  pathOptions={predioStyle}
                />
              )}

            {/* Vecinos: lineas + poligonos en gris tenue. */}
            {vecinosLineasFC && (
              <GeoJSON data={vecinosLineasFC} style={() => vecinoGeoStyle} />
            )}

            {/* Vecinos puntos: marcadores tenues (sin popup para no saturar). */}
            {vecinos
              .filter((v) => v.tipo === "punto" && isGeometryPoint(v.geom))
              .map((v) => {
                const [lon, lat] = extractCoordinates(v.geom)[0] ?? [0, 0];
                if (!lon || !lat) return null;
                return (
                  <Marker
                    key={v.id}
                    position={[lat, lon]}
                    icon={ICON_VECINO}
                  />
                );
              })}

            {/* Intervencion actual (highlight). */}
            {intervencion.tipo === "punto" && intervencion.geom && (
              <Marker
                position={[intervencion.geom.lat, intervencion.geom.lon]}
                icon={ICON_INTERVENCION}
              />
            )}
            {data && <GeoJSON data={data} style={style} />}
          </MapContainer>
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-surface-container-low text-center text-on-surface-variant">
            <MapPin className="mb-2 size-8 opacity-40" />
            <p className="text-body-sm font-semibold">Geometría no disponible</p>
            <p className="mt-1 text-[11px]">
              La propuesta existe pero no tiene geometría asociada en la BD.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Wrappers GeoJSON — FeatureCollection con la geometría de la intervención.
// -----------------------------------------------------------------------------
function lineaToFeature(g: GeoJSONLineString | GeoJSONMultiLineString, id: number) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        id,
        geometry: g,
        properties: { id, tipo: "linea" },
      },
    ],
  };
}

function poligonoToFeature(g: GeoJSONPolygon | GeoJSONMultiPolygon, id: number) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        id,
        geometry: g,
        properties: { id, tipo: "poligono" },
      },
    ],
  };
}

// -----------------------------------------------------------------------------
// Public component — wrapper con `dynamic(..., { ssr: false })`.
// -----------------------------------------------------------------------------
const MapaMiniClient = dynamic(() => Promise.resolve(MapaMiniShell), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-xl bg-surface-variant text-sm text-on-surface-variant">
      <Loader2 className="mr-2 size-4 animate-spin" />
      Cargando mapa…
    </div>
  ),
});

export function IntervencionMapa({
  intervencion,
  contexto,
}: {
  intervencion: IntervencionCompleta;
  contexto: IntervencionContexto | null;
}) {
  return <MapaMiniClient intervencion={intervencion} contexto={contexto} />;
}
