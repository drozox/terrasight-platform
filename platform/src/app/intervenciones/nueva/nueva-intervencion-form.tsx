"use client";

// =============================================================================
// NuevaIntervencionForm — DEEPSEEK-F2.2 + AJUSTE 4
//
// Form client con:
//   - Selector de tipo (punto / linea / poligono)
//   - Mapa Leaflet con herramientas de dibujo manual (click para vertices)
//   - Calculo automatico de area (poligonos), longitud (lineas), coordenadas
//     (puntos) en cliente (sin round-trip a la BD)
//   - Form completo (componente, accion, actividad, municipio, vereda, predio,
//     propietario, estado, fecha, descripcion, observaciones)
//   - POST a /api/intervenciones/nueva -> redirige a /intervenciones/[id]
//
// SRID: 4686 (geografico, lon/lat). El mapa usa el mismo CRS.
// =============================================================================

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon as PPolygon,
  Polyline as PPolyline,
  useMapEvents,
} from "react-leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Circle,
  Slash,
  Hexagon,
  Loader2,
  Save,
  Trash2,
  MapPin,
  Upload,
} from "lucide-react";
import {
  type AccionCode,
} from "@/lib/acciones";

type DrawType = "punto" | "linea" | "poligono";

type AccionMini = { idAccion: number; code: AccionCode; label: string };
type PredioMini = { idPredio: number; nombrePredio: string };
type MunicipioMini = { idMunicipio: number; nombre: string };
type VeredaMini = { idVereda: number; nombre: string; idMunicipio: number };
type PropietarioMini = { idPropietario: number; nombre: string };

const CUNDINAMARCA_CENTER: [number, number] = [4.92, -73.93];

const TIPOS: { key: DrawType; label: string; Icon: typeof Circle; desc: string }[] = [
  {
    key: "punto",
    label: "Punto",
    Icon: Circle,
    desc: "Obras puntuales: cosecha de agua, compostaje, estación, etc.",
  },
  {
    key: "linea",
    label: "Línea",
    Icon: Slash,
    desc: "Líneas: cercos vivos, aislamientos, conectividad.",
  },
  {
    key: "poligono",
    label: "Polígono",
    Icon: Hexagon,
    desc: "Áreas: silvopastoriles, agroforestales, restauración.",
  },
];

const ESTADOS = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "APROBADA", label: "Aprobada" },
  { value: "EN_EJECUCION", label: "En ejecución" },
  { value: "FINALIZADA", label: "Finalizada" },
];

// Marker SVG inline (compatible con bundler porque no usa iconUrl assets).
function iconSvg(color: string): L.DivIcon {
  const html =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="22" height="28">' +
    `<path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 24 16 24s16-13 16-24c0-8.8-7.2-16-16-16z" fill="${color}" stroke="#000" stroke-width="1.5"/>` +
    '<circle cx="16" cy="16" r="5" fill="#FFFFFF"/></svg>';
  return L.divIcon({
    html,
    iconSize: [22, 28],
    iconAnchor: [11, 28],
    className: "leaflet-svg-marker",
  });
}

const MARKER_BLUE = iconSvg("#2f6388");

// --- Geodesia aproximada (Shoelace + factor de latitud) para UI metrics. ---
// La BD recalcula con PostGIS en `crearPropuestaConGeometria`. Aquí solo
// mostramos números rápidos al usuario mientras dibuja.

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

function deg2AreaToHa(deg2: number, meanLat: number): number {
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos((meanLat * Math.PI) / 180);
  const m2 = deg2 * mPerDegLat * mPerDegLon;
  return m2 / 10000;
}

function areaHaFromPolygonGeoJSON(g: GeoJSON.Polygon | GeoJSON.MultiPolygon): number {
  // Cada Polygon tiene rings (number[][][]). Cada MultiPolygon tiene polygons
  // (number[][][][]), donde cada polygon es a su vez number[][][]. Para
  // iterar uniformemente, normalizamos a "array of polygons" (number[][][][])
  // donde cada elemento es un polygon con sus rings.
  const polygons: number[][][][] =
    g.type === "Polygon"
      ? [g.coordinates as number[][][]]
      : (g.coordinates as number[][][][]);
  let totalHa = 0;
  for (const poly of polygons) {
    const ring = (poly as number[][][])[0];
    if (!ring || ring.length < 3) continue;
    const { value, meanLat } = shoelaceAreaDeg2(ring);
    totalHa += deg2AreaToHa(value, meanLat);
  }
  return totalHa;
}

function lengthMFromLineGeoJSON(g: GeoJSON.LineString | GeoJSON.MultiLineString): number {
  const lines: number[][][] = g.type === "LineString" ? [g.coordinates] : g.coordinates;
  let total = 0;
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const [lon1, lat1] = line[i] as [number, number];
      const [lon2, lat2] = line[i + 1] as [number, number];
      const dx = (lon2 - lon1) * (111320 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180));
      const dy = (lat2 - lat1) * 111320;
      total += Math.sqrt(dx * dx + dy * dy);
    }
  }
  return total;
}

// =============================================================================
// Componente principal
// =============================================================================
export function NuevaIntervencionForm({
  acciones,
  predios,
  municipios,
  veredas,
  propietarios,
  initialTipo,
  initialError,
}: {
  acciones: AccionMini[];
  predios: PredioMini[];
  municipios: MunicipioMini[];
  veredas: VeredaMini[];
  propietarios: PropietarioMini[];
  initialTipo: string | null;
  initialError: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tipo, setTipo] = useState<DrawType | null>(
    initialTipo === "punto" || initialTipo === "linea" || initialTipo === "poligono"
      ? (initialTipo as DrawType)
      : null,
  );
  const [idAccion, setIdAccion] = useState<string>("");
  const [idPredio, setIdPredio] = useState<string>("");
  const [idMunicipio, setIdMunicipio] = useState<string>("");
  const [idVereda, setIdVereda] = useState<string>("");
  const [idPropietario, setIdPropietario] = useState<string>("");
  const [estado, setEstado] = useState<string>("BORRADOR");
  const [fecha, setFecha] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [actividad, setActividad] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");
  const [error, setError] = useState<string | null>(initialError);

  const [geom, setGeom] = useState<GeoJSON.Geometry | null>(null);

  // ERROR 2: carga de geometría desde archivo (GPS/KML/SHP/GeoJSON).
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    setError(null);
    try {
      const { parseUpload } = await import("@/lib/geo/parse-upload");
      const res = await parseUpload(file);
      setTipo(res.tipo);
      setGeom(res.geometry);
      setImportMsg(
        `Archivo cargado (${res.total} geometría${res.total === 1 ? "" : "s"}). ` +
          `Se editó la primera: ${res.tipo}.` +
          (res.note ? ` ${res.note}` : ""),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  const veredasFiltradas = useMemo(
    () =>
      idMunicipio
        ? veredas.filter((v) => String(v.idMunicipio) === idMunicipio)
        : [],
    [veredas, idMunicipio],
  );

  const accionSeleccionada =
    acciones.find((a) => String(a.idAccion) === idAccion) ?? null;
  const codigoVisible: AccionCode | null = accionSeleccionada?.code ?? null;

  // Snapshot de la geografia actual (para mostrar metricas).
  const resumenMetricas = useMemo(() => {
    if (!geom || !tipo) return null;
    if (geom.type === "Point" && tipo === "punto") {
      const [lon, lat] = geom.coordinates as number[];
      return (
        <span>
          Coordenadas:{" "}
          <span className="font-mono">
            {(lat ?? 0).toFixed(5)}
          </span>
          ,{" "}
          <span className="font-mono">
            {(lon ?? 0).toFixed(5)}
          </span>
        </span>
      );
    }
    if (
      (geom.type === "LineString" || geom.type === "MultiLineString") &&
      tipo === "linea"
    ) {
      const m = lengthMFromLineGeoJSON(geom);
      return (
        <span>
          Longitud:{" "}
          <span className="font-mono">{m.toFixed(0)} m</span>{" "}
          <span className="text-on-surface-variant">
            ({(m / 1000).toFixed(3)} km)
          </span>
        </span>
      );
    }
    if (
      (geom.type === "Polygon" || geom.type === "MultiPolygon") &&
      tipo === "poligono"
    ) {
      const ha = areaHaFromPolygonGeoJSON(geom);
      return (
        <span>
          Area: <span className="font-mono">{ha.toFixed(4)} ha</span>
        </span>
      );
    }
    return null;
  }, [geom, tipo]);

  function resetShape() {
    setGeom(null);
  }

  function resetForm() {
    setTipo(null);
    setIdAccion("");
    setIdPredio("");
    setIdMunicipio("");
    setIdVereda("");
    setIdPropietario("");
    setEstado("BORRADOR");
    setFecha(new Date().toISOString().slice(0, 10));
    setActividad("");
    setDescripcion("");
    setObservaciones("");
    setGeom(null);
    setImportMsg(null);
    setError(null);
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!tipo) return setError("Selecciona el tipo de intervención.");
    if (!idAccion) return setError("Selecciona la acción (CxAy).");
    if (!geom)
      return setError("Dibuja la geometría en el mapa antes de guardar.");
    if (!actividad.trim()) return setError("Indica la actividad.");

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("tipo", tipo);
        fd.set("idAccion", idAccion);
        fd.set("idPredio", idPredio);
        fd.set("idMunicipio", idMunicipio);
        fd.set("idVereda", idVereda);
        fd.set("idPropietario", idPropietario);
        fd.set("estado", estado);
        fd.set("fecha", fecha);
        fd.set("actividad", actividad);
        fd.set("descripcion", descripcion);
        fd.set("observaciones", observaciones);
        fd.set("geom", JSON.stringify(geom));
        const r = await fetch("/api/intervenciones/nueva", {
          method: "POST",
          body: fd,
        });
        const data = (await r.json()) as {
          ok?: boolean;
          id?: number;
          error?: string;
        };
        if (!r.ok || !data.ok) {
          setError(data.error ?? `Error ${r.status}`);
          return;
        }
        router.push(`/intervenciones/${data.id}`);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-label-lg font-bold text-on-surface">
          Tipo de intervención
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TIPOS.map((t) => {
            const Icon = t.Icon;
            const active = tipo === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTipo(t.key);
                  resetShape();
                }}
                aria-pressed={active}
                className={`flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant bg-surface-container-lowest hover:border-primary/50"
                }`}
              >
                <Icon
                  className={`size-6 ${active ? "text-primary" : "text-on-surface-variant"}`}
                />
                <span className="text-label-lg font-bold">{t.label}</span>
                <span className="text-body-sm text-on-surface-variant">{t.desc}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* ERROR 2: importar geometría desde archivo (GPS/KML/Shapefile/GeoJSON). */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-label-lg font-bold text-on-surface">
              Importar geometría (GPS / KML / Shapefile)
            </p>
            <p className="text-[11px] text-on-surface-variant">
              Acepta shapefile (.zip), .kml, .kmz o GeoJSON. WGS84 o CTM12 (EPSG:9377).
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Importar archivo
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,.shp,.kml,.kmz,.geojson,.json"
          className="hidden"
          onChange={onImportFile}
        />
        {importMsg && (
          <p className="mt-2 rounded-md bg-primary/5 px-2 py-1 text-[11px] text-primary">
            {importMsg}
          </p>
        )}
      </div>

      {tipo && (
        <MapEditor tipo={tipo} geom={geom} onGeomChange={setGeom} />
      )}

      {tipo && (
        <Card className="bg-surface-container-low p-3 text-body-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-on-surface-variant">
              <MapPin className="size-4" />
              Geometría dibujada:
            </span>
            {resumenMetricas ?? (
              <span className="text-on-surface-variant">Ninguna todavía</span>
            )}
            {geom && (
              <Button variant="ghost" size="sm" type="button" onClick={resetShape}>
                <Trash2 className="size-3.5" />
                Limpiar
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Componente / Acción" required>
          <select
            value={idAccion}
            onChange={(e) => setIdAccion(e.target.value)}
            required
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
          >
            <option value="">— Selecciona componente / acción —</option>
            {acciones.map((a) => (
              <option key={a.idAccion} value={a.idAccion}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Estado" required>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
          >
            {ESTADOS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Actividad" required>
          <input
            type="text"
            value={actividad}
            onChange={(e) => setActividad(e.target.value)}
            required
            placeholder="Ej. Cerco vivo multiestrato"
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
          />
        </Field>
        <Field label="Fecha">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
          />
        </Field>
        <Field label="Municipio">
          <select
            value={idMunicipio}
            onChange={(e) => {
              setIdMunicipio(e.target.value);
              setIdVereda("");
            }}
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
          >
            <option value="">— Selecciona municipio —</option>
            {municipios.map((m) => (
              <option key={m.idMunicipio} value={m.idMunicipio}>
                {m.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vereda">
          <select
            value={idVereda}
            onChange={(e) => setIdVereda(e.target.value)}
            disabled={!idMunicipio}
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm disabled:opacity-60"
          >
            <option value="">— Selecciona vereda —</option>
            {veredasFiltradas.map((v) => (
              <option key={v.idVereda} value={v.idVereda}>
                {v.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Predio (opcional)">
          <select
            value={idPredio}
            onChange={(e) => setIdPredio(e.target.value)}
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
          >
            <option value="">— Sin predio asociado —</option>
            {predios.map((p) => (
              <option key={p.idPredio} value={p.idPredio}>
                {p.nombrePredio}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Propietario (opcional)">
          <select
            value={idPropietario}
            onChange={(e) => setIdPropietario(e.target.value)}
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
          >
            <option value="">— Sin propietario —</option>
            {propietarios.map((p) => (
              <option key={p.idPropietario} value={p.idPropietario}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Descripción">
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
          placeholder="Resumen de la intervención…"
          className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
        />
      </Field>

      <Field label="Observaciones">
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={2}
          placeholder="Notas para el equipo (libre)…"
          className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
        />
      </Field>

      {codigoVisible && accionSeleccionada && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-body-sm text-primary">
          Esta intervención se registrará como{" "}
          <span className="font-bold">{accionSeleccionada.label}</span>.
        </div>
      )}

      {error && (
        <p className="rounded-md border border-error/40 bg-error/10 p-3 text-body-sm text-error">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-outline-variant pt-4">
        <Link href="/intervenciones">
          <Button variant="ghost" type="button">
            Cancelar
          </Button>
        </Link>
        <Button variant="ghost" type="button" onClick={resetForm}>
          Limpiar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {isPending ? "Guardando…" : "Crear intervención"}
        </Button>
      </div>
    </form>
  );
}

// =============================================================================
// Field — label + children
// =============================================================================
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-label-lg font-bold text-on-surface">
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
      </label>
      {children}
    </div>
  );
}

// =============================================================================
// MapEditor — Leaflet basico con dibujo manual por clicks.
//   - punto: cada click reemplaza el marcador.
//   - linea: clicks acumulan vertices; preview + boton Cerrar.
//   - poligono: igual que linea, ademas cierra el anillo al final.
// =============================================================================
const DBL_CLICK_MS = 220;

function MapEditor({
  tipo,
  geom,
  onGeomChange,
}: {
  tipo: DrawType;
  geom: GeoJSON.Geometry | null;
  onGeomChange: (g: GeoJSON.Geometry | null) => void;
}) {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [finished, setFinished] = useState(false);
  const clickTimer = useRef<number | null>(null);

  function buildGeomFromPoints(pts: [number, number][]): GeoJSON.Geometry | null {
    if (tipo === "punto") {
      const last = pts[pts.length - 1];
      if (!last) return null;
      const [lat, lon] = last;
      return { type: "Point", coordinates: [lon, lat] };
    }
    if (tipo === "linea") {
      if (pts.length < 2) return null;
      const coords = pts.map(([lat, lon]) => [lon, lat] as [number, number]);
      return { type: "LineString", coordinates: coords };
    }
    if (tipo === "poligono") {
      if (pts.length < 3) return null;
      const ring = pts.map(([lat, lon]) => [lon, lat] as [number, number]);
      ring.push([ring[0]?.[0] ?? 0, ring[0]?.[1] ?? 0]);
      return { type: "Polygon", coordinates: [ring] };
    }
    return null;
  }

  // Sincronizar geometria externa -> puntos.
  useEffect(() => {
    if (!geom) {
      setPoints([]);
      return;
    }
    if (geom.type === "Point") {
      const [lon, lat] = geom.coordinates as number[];
      setPoints([[lat, lon]]);
    } else if (geom.type === "LineString") {
      setPoints(
        (geom.coordinates as number[][]).map(
          ([lon, lat]) => [lat, lon] as [number, number],
        ),
      );
    } else if (geom.type === "Polygon") {
      const ring = (geom.coordinates as number[][][])[0] ?? [];
      // Quitar el ultimo punto (cierre duplicado).
      const closed = ring.length > 1 && ring[0]?.[0] === ring[ring.length - 1]?.[0] && ring[0]?.[1] === ring[ring.length - 1]?.[1]
        ? ring.slice(0, -1)
        : ring;
      setPoints(
        closed.map(([lon, lat]) => [lat, lon] as [number, number]),
      );
    }
  }, [geom]);

  function handleMapClick(e: L.LeafletMouseEvent) {
    if (finished) return;
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    if (tipo === "punto") {
      setPoints([[lat, lng]]);
      onGeomChange({ type: "Point", coordinates: [lng, lat] });
      return;
    }
    // Se retrasa para no duplicar el vértice con el doble click.
    if (clickTimer.current != null) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
      return;
    }
    const latlng = e.latlng;
    clickTimer.current = window.setTimeout(() => {
      clickTimer.current = null;
      const next: [number, number][] = [...points, [latlng.lat, latlng.lng]];
      setPoints(next);
      onGeomChange(buildGeomFromPoints(next));
    }, DBL_CLICK_MS);
  }

  function handleMapDblClick() {
    if (clickTimer.current != null) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    finishShape();
  }

  function handleMapMouseMove(e: L.LeafletMouseEvent) {
    if (tipo === "punto" || finished) return;
    setHover([e.latlng.lat, e.latlng.lng]);
  }

  function finishShape() {
    if (tipo === "punto") return;
    if (points.length < (tipo === "linea" ? 2 : 3)) return;
    setFinished(true);
    setHover(null);
    onGeomChange(buildGeomFromPoints(points));
  }

  function clearAll() {
    if (clickTimer.current != null) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    setPoints([]);
    setHover(null);
    setFinished(false);
    onGeomChange(null);
  }

  function undoLast() {
    if (tipo === "punto" || points.length <= 1) {
      clearAll();
      return;
    }
    const next = points.slice(0, -1);
    setPoints(next);
    setFinished(false);
    onGeomChange(buildGeomFromPoints(next));
  }

  // "Enter" finaliza el dibujo (cuando no se está escribiendo en un campo).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || finished || tipo === "punto") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
      if (points.length >= (tipo === "linea" ? 2 : 3)) {
        e.preventDefault();
        finishShape();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, tipo, points.length]);

  // Render del preview.
  const previewLine: [number, number][] =
    tipo === "punto" || finished || !hover || points.length === 0
      ? []
      : [...points, hover];
  const previewPolygon: [number, number][] =
    tipo === "poligono" && !finished && hover && points.length >= 2
      ? [...points, hover, points[0] as [number, number]]
      : [];
  const finalLine: [number, number][] = finished && tipo === "linea" ? points : [];
  const finalPolygon: [number, number][] =
    finished && tipo === "poligono" && points.length >= 3
      ? [...points, points[0] as [number, number]]
      : [];

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-low px-4 py-2">
        <p className="text-body-sm text-on-surface-variant">
          {tipo === "punto" && "Haz click en el mapa para colocar el punto."}
          {(tipo === "linea" || tipo === "poligono") &&
            (finished
              ? `Dibujo finalizado (${points.length} vértices). Usá "Deshacer" o "Limpiar" para ajustar.`
              : `Haz click para colocar vértices (${points.length}). Doble click o Enter para finalizar.`)}
        </p>
        <div className="flex items-center gap-1">
          {(tipo === "linea" || tipo === "poligono") && points.length > 0 && (
            <Button variant="ghost" size="sm" type="button" onClick={undoLast}>
              Deshacer vértice
            </Button>
          )}
          {(tipo === "linea" || tipo === "poligono") &&
            !finished &&
            points.length >= (tipo === "linea" ? 2 : 3) && (
              <Button size="sm" type="button" onClick={finishShape}>
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
          center={CUNDINAMARCA_CENTER}
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
            onClick={handleMapClick}
            onDblClick={handleMapDblClick}
            onMove={handleMapMouseMove}
          />
          {tipo === "punto" && points.length > 0 && (
            <Marker
              position={points[points.length - 1] as [number, number]}
              icon={MARKER_BLUE}
            />
          )}
          {(tipo === "linea" || tipo === "poligono") &&
            previewLine.length > 1 && (
              <PPolyline
                positions={previewLine}
                pathOptions={{ color: "#006d37", weight: 3, dashArray: "4 3" }}
              />
            )}
          {tipo === "poligono" && previewPolygon.length > 2 && (
            <PPolygon
              positions={previewPolygon}
              pathOptions={{
                color: "#006d37",
                weight: 2,
                fillColor: "#006d37",
                fillOpacity: 0.18,
                dashArray: "4 3",
              }}
            />
          )}
          {finalLine.length > 1 && (
            <PPolyline
              positions={finalLine}
              pathOptions={{ color: "#006d37", weight: 3.5 }}
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
  );
}

// =============================================================================
// MapClicker — captura clicks, doble click y mousemove del mapa Leaflet.
// =============================================================================
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
