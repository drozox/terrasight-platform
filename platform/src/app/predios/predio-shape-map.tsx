"use client";

// =============================================================================
// PredioShapeMap — editor de shape para el alta de predios (DEEPSEEK-F3.2).
//
//   - Dibujo manual: click agrega vértices; doble click o Enter finaliza.
//   - Carga de archivo: shapefile (.zip/.shp), KML, KMZ o GeoJSON.
//   - Al finalizar se calculan (aprox. en cliente) área, perímetro y centroide,
//     y se emite el WKT en SRID 4326 (lon/lat). La BD recalcula con PostGIS.
//   - "Deshacer" / "Limpiar" para corregir.
// El shape es OBLIGATORIO: el formulario padre bloquea el guardado sin WKT.
// =============================================================================

import { useEffect, useRef, useState } from "react";
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
import { Loader2, Trash2, Undo2, Upload } from "lucide-react";

export type ShapeMetrics = {
  wkt: string;
  areaHa: number;
  perimetroM: number;
  latitud: number;
  longitud: number;
};

const CENTER: [number, number] = [4.92, -73.93];
const DBL_CLICK_MS = 220;

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

/** Toma el primer anillo exterior (el de mayor área) de un Polygon/MultiPolygon. */
function geometryToRing(g: GeoJSON.Geometry | null): number[][] | null {
  if (!g) return null;
  if (g.type === "Polygon") return (g.coordinates[0] as number[][]) ?? null;
  if (g.type === "MultiPolygon") {
    const polys = g.coordinates as number[][][][];
    if (!polys.length) return null;
    const biggest = polys.reduce((a, b) => (b[0].length > a[0].length ? b : a));
    return biggest[0] ?? null;
  }
  return null;
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
  const [loading, setLoading] = useState(false);
  const [fileMsg, setFileMsg] = useState<string | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const clickTimer = useRef<number | null>(null);

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

  function addVertex(latlng: L.LatLng) {
    setPoints((prev) => [...prev, [latlng.lat, latlng.lng]]);
  }

  // Click simple agrega vértice; se retrasa para no duplicar en doble click.
  function handleClick(e: L.LeafletMouseEvent) {
    if (closed) return;
    if (clickTimer.current != null) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
      return;
    }
    const latlng = e.latlng;
    clickTimer.current = window.setTimeout(() => {
      clickTimer.current = null;
      addVertex(latlng);
    }, DBL_CLICK_MS);
  }

  function closeShape() {
    if (points.length < 3) return;
    setClosed(true);
    setHover(null);
    emit(points, true);
  }

  function handleDblClick() {
    if (clickTimer.current != null) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    closeShape();
  }

  // "Enter" finaliza el dibujo (cuando no se está escribiendo en un campo).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || closed) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
      if (points.length >= 3) {
        e.preventDefault();
        closeShape();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closed, points.length]);

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    setFileMsg(null);
    setFileErr(null);
    try {
      const { parseUpload } = await import("@/lib/geo/parse-upload");
      const res = await parseUpload(file);
      const ring = geometryToRing(res.geometry);
      if (!ring || ring.length < 3) {
        throw new Error(
          "El archivo no contiene un polígono válido (se requiere Polygon/MultiPolygon para un predio).",
        );
      }
      // Quitar el cierre duplicado si viene.
      const clean =
        ring.length > 1 &&
        ring[0]?.[0] === ring[ring.length - 1]?.[0] &&
        ring[0]?.[1] === ring[ring.length - 1]?.[1]
          ? ring.slice(0, -1)
          : ring;
      const pts = clean.map(([lon, lat]) => [lat, lon] as [number, number]);
      setPoints(pts);
      setClosed(true);
      setHover(null);
      emit(pts, true);
      setFileMsg(`Archivo cargado: ${clean.length} vértices${res.note ? `. ${res.note}` : ""}.`);
    } catch (err) {
      setFileErr((err as Error).message);
    } finally {
      setLoading(false);
    }
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
    setFileMsg(null);
    setFileErr(null);
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
        {/* Carga de archivo */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-lowest px-4 py-2">
          <p className="text-[11px] text-on-surface-variant">
            Cargar shapefile (.zip/.shp), KML, KMZ o GeoJSON — o dibujar en el mapa.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            Cargar archivo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,.shp,.dbf,.prj,.kml,.kmz,.geojson,.json"
            className="hidden"
            onChange={onImportFile}
          />
        </div>
        {fileMsg && (
          <p className="border-b border-outline-variant bg-primary/5 px-4 py-1.5 text-[11px] text-primary">
            {fileMsg}
          </p>
        )}
        {fileErr && (
          <p className="border-b border-outline-variant bg-error/5 px-4 py-1.5 text-[11px] text-error">
            {fileErr}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-low px-4 py-2">
          <p className="text-body-sm text-on-surface-variant">
            {closed
              ? `Shape cerrado (${points.length} vértices). Usá "Limpiar" para rehacerlo.`
              : points.length === 0
                ? "Hacé click en el mapa para dibujar el polígono del predio."
                : `Click para agregar vértices (${points.length}). Doble click o Enter para finalizar.`}
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
                Finalizar
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
            doubleClickZoom={false}
            className="h-full w-full"
            style={{ background: "#cee5d8" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap"
            />
            <MapClicker
              onClick={handleClick}
              onDblClick={handleDblClick}
              onMove={(e) => {
                if (!closed) setHover([e.latlng.lat, e.latlng.lng]);
              }}
            />
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
  onDblClick,
  onMove,
}: {
  onClick: (e: L.LeafletMouseEvent) => void;
  onDblClick: (e: L.LeafletMouseEvent) => void;
  onMove: (e: L.LeafletMouseEvent) => void;
}) {
  useMapEvents({
    click: (e) => onClick(e),
    dblclick: (e) => onDblClick(e),
    mousemove: (e) => onMove(e),
  });
  return null;
}
