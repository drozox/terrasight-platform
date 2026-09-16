"use client";

// =============================================================================
// PredioShapeMap — editor de shape para el alta de predios (DEEPSEEK-F3.2).
//
// Dibujo manual por clicks (mismo patrón que /intervenciones/nueva):
//   - click agrega vértices; "Cerrar" cierra el anillo.
//   - Al cerrar se calculan (aprox. en cliente) área, perímetro y centroide, y
//     se emite el WKT en SRID 4326 (lon/lat). La BD recalcula con PostGIS.
//   - "Deshacer" / "Limpiar" para corregir.
// El shape es OBLIGATORIO: el formulario padre bloquea el guardado sin WKT.
// =============================================================================

import { useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Polygon as PPolygon,
  Polyline as PPolyline,
  useMapEvents,
} from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Undo2 } from "lucide-react";

export type ShapeMetrics = {
  wkt: string;
  areaHa: number;
  perimetroM: number;
  latitud: number;
  longitud: number;
};

const CENTER: [number, number] = [4.92, -73.93];

// --- Geodesia aproximada para métricas de UI (la BD usa PostGIS exacto) ---
function shoelaceAreaDeg2(ring: number[][]): { value: number; meanLat: number } {
  if (ring.length < 3) return { value: 0, meanLat: 0 };
  let sum = 0;
  let latSum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lon1, lat1] = ring[i] as [number, number];
    const [lon2, lat2] = ring[(i + 1) % ring.length] as [number, number];
    sum += (lon2 - lon1) * (lat2 + lat1);
    latSum += lat1;
  }
  return { value: Math.abs(sum / 2), meanLat: latSum / ring.length };
}

function areaHa(ring: number[][]): number {
  const { value, meanLat } = shoelaceAreaDeg2(ring);
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos((meanLat * Math.PI) / 180);
  return (value * mPerDegLat * mPerDegLon) / 10000;
}

function perimetroM(ring: number[][]): number {
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lon1, lat1] = ring[i] as [number, number];
    const [lon2, lat2] = ring[(i + 1) % ring.length] as [number, number];
    const dx = (lon2 - lon1) * (111320 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180));
    const dy = (lat2 - lat1) * 111320;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

function centroide(ring: number[][]): { latitud: number; longitud: number } {
  const n = ring.length || 1;
  let lat = 0;
  let lon = 0;
  for (const [lo, la] of ring) {
    lon += lo;
    lat += la;
  }
  return { latitud: lat / n, longitud: lon / n };
}

/** ring en [lon,lat] → WKT POLYGON SRID 4326. */
function ringToWkt(ring: number[][]): string {
  const closed = [...ring, ring[0] as number[]];
  const pts = closed.map(([lon, lat]) => `${lon} ${lat}`).join(", ");
  return `POLYGON((${pts}))`;
}

export function PredioShapeMap({
  onChange,
  error,
}: {
  onChange: (m: ShapeMetrics | null) => void;
  error?: string | null;
}) {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [closed, setClosed] = useState(false);

  function emit(pts: [number, number][], close: boolean) {
    if (!close || pts.length < 3) {
      onChange(null);
      return;
    }
    const ring = pts.map(([lat, lon]) => [lon, lat] as number[]);
    const c = centroide(ring);
    onChange({
      wkt: ringToWkt(ring),
      areaHa: areaHa(ring),
      perimetroM: perimetroM(ring),
      latitud: c.latitud,
      longitud: c.longitud,
    });
  }

  function handleClick(e: L.LeafletMouseEvent) {
    if (closed) return;
    const next: [number, number][] = [...points, [e.latlng.lat, e.latlng.lng]];
    setPoints(next);
    emit(next, false);
  }

  function closeShape() {
    if (points.length < 3) return;
    setClosed(true);
    setHover(null);
    emit(points, true);
  }

  function undoLast() {
    setClosed(false);
    const next = points.slice(0, -1);
    setPoints(next);
    emit(next, false);
  }

  function clearAll() {
    setClosed(false);
    setPoints([]);
    setHover(null);
    onChange(null);
  }

  const previewLine: [number, number][] =
    !closed && hover && points.length > 0 ? [...points, hover] : [];
  const previewPolygon: [number, number][] =
    !closed && hover && points.length >= 2
      ? [...points, hover, points[0] as [number, number]]
      : [];
  const finalPolygon: [number, number][] =
    closed && points.length >= 3 ? [...points, points[0] as [number, number]] : [];

  return (
    <div className="space-y-2">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-low px-4 py-2">
          <p className="text-body-sm text-on-surface-variant">
            {closed
              ? `Shape cerrado (${points.length} vértices). Usá "Limpiar" para rehacerlo.`
              : points.length === 0
                ? "Hacé click en el mapa para dibujar el polígono del predio."
                : `Click para agregar vértices (${points.length}). Mínimo 3 y pulsá "Cerrar".`}
          </p>
          <div className="flex items-center gap-1">
            {!closed && points.length > 0 && (
              <Button variant="ghost" size="sm" type="button" onClick={undoLast}>
                <Undo2 className="size-3.5" />
                Deshacer
              </Button>
            )}
            {!closed && points.length >= 3 && (
              <Button size="sm" type="button" onClick={closeShape}>
                Cerrar
              </Button>
            )}
            <Button variant="ghost" size="sm" type="button" onClick={clearAll}>
              <Trash2 className="size-3.5" />
              Limpiar
            </Button>
          </div>
        </div>
        <div className="h-80 w-full">
          <MapContainer
            center={CENTER}
            zoom={11}
            scrollWheelZoom
            className="h-full w-full"
            style={{ background: "#cee5d8" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap"
            />
            <MapClicker onClick={handleClick} onMove={(e) => {
              if (!closed) setHover([e.latlng.lat, e.latlng.lng]);
            }} />
            {previewLine.length > 1 && (
              <PPolyline
                positions={previewLine}
                pathOptions={{ color: "#006d37", weight: 3, dashArray: "4 3" }}
              />
            )}
            {previewPolygon.length > 2 && (
              <PPolygon
                positions={previewPolygon}
                pathOptions={{ color: "#006d37", weight: 2, fillColor: "#006d37", fillOpacity: 0.18, dashArray: "4 3" }}
              />
            )}
            {finalPolygon.length > 2 && (
              <PPolygon
                positions={finalPolygon}
                pathOptions={{ color: "#006d37", weight: 2.5, fillColor: "#2e7d4f", fillOpacity: 0.3 }}
              />
            )}
          </MapContainer>
        </div>
      </Card>
      {error && <p className="text-[11px] text-error">{error}</p>}
    </div>
  );
}

function MapClicker({
  onClick,
  onMove,
}: {
  onClick: (e: L.LeafletMouseEvent) => void;
  onMove: (e: L.LeafletMouseEvent) => void;
}) {
  useMapEvents({
    click: (e) => onClick(e),
    mousemove: (e) => onMove(e),
  });
  return null;
}
