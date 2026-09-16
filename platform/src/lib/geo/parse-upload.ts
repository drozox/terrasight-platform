"use client";

// =============================================================================
// parse-upload.ts — parseo client-side de archivos de geometría para el alta
// de intervenciones (ERROR 2):
//   - GeoJSON (.geojson / .json)
//   - KML (.kml) y KMZ (.kmz)
//   - Shapefile (.zip o .shp)  vía shpjs
//
// Devuelve la PRIMERA geometría soportada (punto / línea / polígono) ya en
// WGS84 (EPSG:4326, lon/lat). Si el archivo viene en CTM12 (EPSG:9377,
// coordenadas proyectadas en metros) se reproyecta automáticamente. Si las
// coordenadas no son ni WGS84 ni CTM12, se lanza un error explicativo.
// =============================================================================

import JSZip from "jszip";
import proj4 from "proj4";
import { kml as kmlToGeoJSON } from "@tmcw/togeojson";
import type { FeatureCollection, Feature, Geometry } from "geojson";

export type UploadTipo = "punto" | "linea" | "poligono";

export interface ParsedUpload {
  geometry: Geometry;
  tipo: UploadTipo;
  total: number;
  note?: string;
}

// CTM12 / EPSG:9377 — Origen Nacional (Resolución IGAC 471 de 2020).
proj4.defs(
  "EPSG:9377",
  "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0 +units=m +no_defs",
);

const WGS84 = "EPSG:4326";
const CTM12 = "EPSG:9377";

function normalizeFC(data: unknown): FeatureCollection {
  const d = data as FeatureCollection | Feature | Geometry;
  if (!d) throw new Error("Archivo vacío o inválido.");
  if ((d as FeatureCollection).type === "FeatureCollection") return d as FeatureCollection;
  if ((d as Feature).type === "Feature") {
    return { type: "FeatureCollection", features: [d as Feature] };
  }
  return { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: d as Geometry }] };
}

export function geometriaKind(g: Geometry | null | undefined): UploadTipo | null {
  if (!g) return null;
  switch (g.type) {
    case "Point":
    case "MultiPoint":
      return "punto";
    case "LineString":
    case "MultiLineString":
      return "linea";
    case "Polygon":
    case "MultiPolygon":
      return "poligono";
    default:
      return null;
  }
}

function flattenCoords(g: Geometry): number[][] {
  const out: number[][] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) {
      if (v.length >= 2 && typeof v[0] === "number" && typeof v[1] === "number") {
        out.push([v[0], v[1]]);
      } else {
        v.forEach(walk);
      }
    }
  };
  walk((g as { coordinates: unknown }).coordinates);
  return out;
}

function inColombiaLonLat(pts: number[][]): boolean {
  return (
    pts.length > 0 &&
    pts.every(([lon, lat]) => lon >= -82 && lon <= -66 && lat >= -6 && lat <= 14)
  );
}

/** Heurística: CTM12 tiene X ~ 4.0e6-6.5e6 e Y ~ 1.0e6-2.8e6. */
function looksProjectedCTM12(pts: number[][]): boolean {
  return (
    pts.length > 0 &&
    pts.every(([x, y]) => x > 1_000_000 && x < 8_000_000 && y > 500_000 && y < 3_500_000)
  );
}

function reproject(g: Geometry, from: string): Geometry {
  const mapPos = (pos: number[]): number[] => {
    const [lon, lat] = proj4(from, WGS84, [pos[0], pos[1]]);
    return [lon, lat, ...pos.slice(2)];
  };
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) {
      if (v.length >= 2 && typeof v[0] === "number" && typeof v[1] === "number") {
        return mapPos(v as number[]);
      }
      return v.map(walk);
    }
    return v;
  };
  return { ...g, coordinates: walk((g as { coordinates: unknown }).coordinates) } as Geometry;
}

async function parseShapefile(file: File): Promise<FeatureCollection> {
  const shp = (await import("shpjs")).default;
  const buf = await file.arrayBuffer();
  const parsed = (await shp(buf)) as FeatureCollection | FeatureCollection[];
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  const features = arr.flatMap((fc) => fc.features ?? []);
  return { type: "FeatureCollection", features };
}

export async function parseUpload(file: File): Promise<ParsedUpload> {
  const name = file.name.toLowerCase();
  let fc: FeatureCollection;

  if (name.endsWith(".geojson") || name.endsWith(".json")) {
    fc = normalizeFC(JSON.parse(await file.text()));
  } else if (name.endsWith(".kml")) {
    fc = kmlToGeoJSON(
      new DOMParser().parseFromString(await file.text(), "text/xml"),
    ) as FeatureCollection;
  } else if (name.endsWith(".kmz")) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entry = Object.values(zip.files).find((f) =>
      f.name.toLowerCase().endsWith(".kml"),
    );
    if (!entry) throw new Error("El KMZ no contiene ningún archivo .kml.");
    fc = kmlToGeoJSON(
      new DOMParser().parseFromString(await entry.async("text"), "text/xml"),
    ) as FeatureCollection;
  } else if (name.endsWith(".zip") || name.endsWith(".shp")) {
    fc = await parseShapefile(file);
  } else {
    throw new Error(
      "Formato no soportado. Acepta shapefile (.zip/.shp), .kml, .kmz, .geojson o .json.",
    );
  }

  const feats = (fc?.features ?? []).filter(
    (f): f is Feature => !!f && !!(f as Feature).geometry,
  );
  if (feats.length === 0) {
    throw new Error("El archivo no contiene geometrías válidas.");
  }

  const chosen = feats.find((f) => geometriaKind(f.geometry as Geometry));
  if (!chosen) {
    throw new Error("Geometría no soportada (se esperaba punto, línea o polígono).");
  }

  let geometry = chosen.geometry as Geometry;
  let note: string | undefined;

  const pts = flattenCoords(geometry);
  if (!inColombiaLonLat(pts)) {
    if (looksProjectedCTM12(pts)) {
      geometry = reproject(geometry, CTM12);
      note = "Coordenadas detectadas en CTM12 (EPSG:9377); reproyectadas a WGS84.";
      if (!inColombiaLonLat(flattenCoords(geometry))) {
        throw new Error(
          "El archivo está en coordenadas proyectadas que no se pudieron reproyectar a WGS84. Verificá el sistema de referencia (CTM12 / EPSG:9377).",
        );
      }
    } else {
      throw new Error(
        "Las coordenadas no corresponden a Colombia en WGS84 (lon/lat) ni a CTM12 (EPSG:9377). Revisá el sistema de referencia del archivo.",
      );
    }
  }

  return { geometry, tipo: geometriaKind(geometry)!, total: feats.length, note };
}
