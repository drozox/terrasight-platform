// =============================================================================
// Importador de capas geográficas para el módulo de Acciones del Convenio
// CAR–WWF–Fundación Natura (SIG TERRITORIO / TG-Nikoll).
//
// Acepta dos formatos:
//   - GeoJSON (FeatureCollection con Point, LineString, Polygon y Multi*)
//   - Shapefile (.zip con .shp + .dbf + .prj, o un solo .shp + .dbf adjuntos)
//
// Cada feature se transforma en una fila de:
//   - sgs_pro_propuesta (super-tipo)
//   - sgs_pro_propuesta_punto / linea / poligono (sub-tipo con geometría)
//
// Los atributos sugeridos del GeoJSON (todos opcionales, fallback a defaults):
//   - actividad      (string)        descripción de la actividad
//   - componente     ("C1"|"C2"|"C3") clasificación de la propuesta
//   - accion         ("A1"|"A2")     acción dentro del componente
//   - id_predio      (number)        FK al predio asociado
//   - id_quebrada    (number)        FK a la quebrada asociada
//   - nombre         (string)        nombre del feature (si no, ID auto)
//
// Si el feature no trae `id_predio`, se intenta asignación por vecino más
// cercano contra el centroide de `sgs_pre_predio` (heurística KNN postgis).
// =============================================================================

import * as turf from "@turf/turf";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  Point,
  LineString,
  Polygon,
} from "geojson";

// -----------------------------------------------------------------------------
// Tipos públicos
// -----------------------------------------------------------------------------

export type TipoPropuesta = "punto" | "linea" | "poligono";
export type ComponenteKey = "C1" | "C2" | "C3";
export type AccionKey = "A1" | "A2";

/** Atributos que el importador intenta extraer del GeoJSON / DBF */
export interface FeatureAtributos {
  actividad?: string;
  componente?: ComponenteKey;
  accion?: AccionKey;
  id_predio?: number;
  id_quebrada?: number;
  nombre?: string;
}

/** Una propuesta lista para insertar en la BD */
export interface PropuestaImportada {
  /** Tipo de geometría → tabla destino */
  tipo: TipoPropuesta;
  /** Actividad / descripción */
  actividad: string;
  /** Componente C1/C2/C3 (default "C1") */
  componente: ComponenteKey;
  /** Acción A1/A2 (default "A1") */
  accion: AccionKey;
  /** FK al predio (opcional) */
  id_predio: number | null;
  /** FK a la quebrada (opcional) */
  id_quebrada: number | null;
  /** Nombre del feature */
  nombre: string;
  /** GeoJSON geometry (Point, LineString o Polygon) */
  geometry: Point | LineString | Polygon;
  /** Métricas calculadas (varían por tipo) */
  metricas: {
    /** Centroide [lon, lat] */
    centroide: [number, number];
    /** Bbox [minX, minY, maxX, maxY] */
    bbox: [number, number, number, number];
    /** Solo polígonos: área en hectáreas */
    area_ha?: number;
    /** Solo líneas: longitud en metros */
    longitud_m?: number;
  };
}

/** Resultado agregado del parseo / validación */
export interface ResumenImportacion {
  total: number;
  puntos: number;
  lineas: number;
  poligonos: number;
  /** Lista de features que se mapearán a la BD */
  propuestas: PropuestaImportada[];
  /** Errores / features descartados */
  advertencias: string[];
  /** Bbox agregado del set completo */
  bbox: [number, number, number, number] | null;
  /** Sistema de referencia detectado (WKT, si fue posible leerlo del .prj) */
  srsDetectado?: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const COMPONENTES_VALIDOS: ComponenteKey[] = ["C1", "C2", "C3"];
const ACCIONES_VALIDAS: AccionKey[] = ["A1", "A2"];

function pickString(props: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = props[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

function pickNumber(props: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = props[k];
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function pickEnum<T extends string>(
  props: Record<string, unknown>,
  keys: string[],
  valid: readonly T[],
  fallback: T,
): T {
  const v = pickString(props, keys);
  if (v && (valid as readonly string[]).includes(v)) return v as T;
  return fallback;
}

/** Convierte el primer vértice de cualquier geometría en un Point centroid-free. */
function firstVertexAsPoint(g: Geometry): Point | null {
  switch (g.type) {
    case "Point":
      return g;
    case "MultiPoint":
    case "LineString":
      return g.coordinates[0] ? { type: "Point", coordinates: g.coordinates[0] as [number, number] } : null;
    case "MultiLineString":
    case "Polygon":
      return g.coordinates[0]?.[0]
        ? { type: "Point", coordinates: g.coordinates[0][0] as [number, number] }
        : null;
    case "MultiPolygon":
      return g.coordinates[0]?.[0]?.[0]
        ? { type: "Point", coordinates: g.coordinates[0][0][0] as [number, number] }
        : null;
    default:
      return null;
  }
}

/** Normaliza Multi* a su contraparte simple (turf sólo opera sobre simples). */
function normalizeGeometry(g: Geometry): Point | LineString | Polygon | null {
  switch (g.type) {
    case "Point":
    case "LineString":
    case "Polygon":
      return g;
    case "MultiPoint":
      return g.coordinates[0]
        ? ({ type: "Point",        coordinates: g.coordinates[0]     as [number, number] })
        : null;
    case "MultiLineString":
      return g.coordinates[0]
        ? ({ type: "LineString",   coordinates: g.coordinates[0]     as [number, number][] })
        : null;
    case "MultiPolygon":
      return g.coordinates[0]
        ? ({ type: "Polygon",      coordinates: g.coordinates[0]     as [number, number][][] })
        : null;
    default:
      return null;
  }
}

/** Decide el tipo de propuesta según la geometría */
function geometryToTipo(g: Geometry): TipoPropuesta | null {
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

/** Calcula métrica principal según tipo */
function calcularMetricas(g: Point | LineString | Polygon, tipo: TipoPropuesta) {
  const feat = turf.feature(g);
  const bbox = turf.bbox(feat) as [number, number, number, number];
  const centroide = turf.centroid(feat).geometry.coordinates as [number, number];
  const metricas: PropuestaImportada["metricas"] = {
    centroide,
    bbox,
  };
  if (tipo === "poligono") {
    const m2 = turf.area(feat); // m²
    metricas.area_ha = Math.round((m2 / 10_000) * 100) / 100;
  } else if (tipo === "linea") {
    // turf.length en km (por defecto). Pasamos a metros.
    const km = turf.length(feat, { units: "kilometers" });
    metricas.longitud_m = Math.round(km * 1000 * 100) / 100;
  }
  return metricas;
}

/** Construye una PropuestaImportada a partir de una feature GeoJSON */
function featureToPropuesta(
  feature: Feature,
  index: number,
  advertencias: string[],
): PropuestaImportada | null {
  if (!feature.geometry) {
    advertencias.push(`Feature #${index + 1}: sin geometría, descartada.`);
    return null;
  }
  const tipo = geometryToTipo(feature.geometry);
  if (!tipo) {
    advertencias.push(
      `Feature #${index + 1}: tipo "${feature.geometry.type}" no soportado, descartada.`,
    );
    return null;
  }
  const normalized = normalizeGeometry(feature.geometry);
  if (!normalized) {
    advertencias.push(`Feature #${index + 1}: no se pudo normalizar la geometría, descartada.`);
    return null;
  }
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const actividad =
    pickString(props, ["actividad", "ACTIVIDAD", "activity", "nombre_actividad"]) ?? "Importado";
  const componente = pickEnum<ComponenteKey>(props, ["componente", "COMPONENTE", "componente_nombre"], COMPONENTES_VALIDOS, "C1");
  const accion = pickEnum<AccionKey>(props, ["accion", "ACCION", "id_accion_nombre"], ACCIONES_VALIDAS, "A1");
  const id_predio = pickNumber(props, ["id_predio", "ID_PREDIO", "predio_id"]);
  const id_quebrada = pickNumber(props, ["id_quebrada", "ID_QUEBRADA", "quebrada_id"]);
  const nombre =
    pickString(props, ["nombre", "NOMBRE", "name", "titulo"]) ??
    `Importado #${String(index + 1).padStart(4, "0")}`;
  const metricas = calcularMetricas(normalized, tipo);
  return {
    tipo,
    actividad,
    componente,
    accion,
    id_predio: id_predio ?? null,
    id_quebrada: id_quebrada ?? null,
    nombre,
    geometry: normalized,
    metricas,
  };
}

// -----------------------------------------------------------------------------
// Parsers públicos
// -----------------------------------------------------------------------------

/** Parsea un objeto JSON con estructura GeoJSON FeatureCollection */
export function parseGeoJSON(text: string): FeatureCollection {
  const data = JSON.parse(text);
  if (data?.type !== "FeatureCollection") {
    if (data?.type === "Feature") return { type: "FeatureCollection", features: [data] };
    throw new Error(
      `GeoJSON inválido: type="${data?.type ?? "?"}". Se esperaba FeatureCollection o Feature.`,
    );
  }
  if (!Array.isArray(data.features)) {
    throw new Error("GeoJSON inválido: falta array 'features'.");
  }
  return data as FeatureCollection;
}

/** Parsea un shapefile (archivo .shp solo, .zip con .shp+.dbf+.prj, o ArrayBuffer mixto) */
export async function parseShapefile(
  files: File[] | File,
): Promise<FeatureCollection> {
  // Import dinámico para evitar SSR
  const shp = (await import("shpjs")).default;
  const fileList = Array.isArray(files) ? files : [files];
  if (fileList.length === 1) {
    const f = fileList[0];
    const name = f.name.toLowerCase();
    if (name.endsWith(".zip")) {
      const buf = await f.arrayBuffer();
      const fc = (await shp(buf)) as FeatureCollection | FeatureCollection[];
      return Array.isArray(fc) ? mergeFeatureCollections(fc) : fc;
    }
    if (name.endsWith(".shp")) {
      const shpBuf = await f.arrayBuffer();
      // Buscar .dbf hermano en el mismo array
      const base = f.name.replace(/\.shp$/i, "");
      const dbf = fileList.find((x) => x.name.toLowerCase() === `${base.toLowerCase()}.dbf`);
      const dbfBuf = dbf ? await dbf.arrayBuffer() : undefined;
      const fc = (await shp(shpBuf, dbfBuf)) as FeatureCollection | FeatureCollection[];
      return Array.isArray(fc) ? mergeFeatureCollections(fc) : fc;
    }
    throw new Error(
      "Shapefile: se esperaba .zip o .shp (con .dbf opcional en el mismo envío).",
    );
  }
  // Múltiples archivos: buscar pares .shp+.dbf
  const shps = fileList.filter((x) => x.name.toLowerCase().endsWith(".shp"));
  if (shps.length === 0) {
    throw new Error("Shapefile: no se encontró ningún archivo .shp en el envío.");
  }
  const allFeatures: Feature[] = [];
  for (const shpFile of shps) {
    const base = shpFile.name.replace(/\.shp$/i, "");
    const dbf = fileList.find((x) => x.name.toLowerCase() === `${base.toLowerCase()}.dbf`);
    const shpBuf = await shpFile.arrayBuffer();
    const dbfBuf = dbf ? await dbf.arrayBuffer() : undefined;
    const fc = (await shp(shpBuf, dbfBuf)) as FeatureCollection | FeatureCollection[];
    const features = Array.isArray(fc) ? mergeFeatureCollections(fc).features : fc.features;
    allFeatures.push(...features);
  }
  return { type: "FeatureCollection", features: allFeatures };
}

function mergeFeatureCollections(fcs: FeatureCollection[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fcs.flatMap((fc) => fc.features),
  };
}

/** Detecta y parsea un archivo según su nombre / contenido */
export async function parseArchivoCapas(file: File): Promise<FeatureCollection> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".geojson") || name.endsWith(".json")) {
    const text = await file.text();
    return parseGeoJSON(text);
  }
  if (name.endsWith(".zip") || name.endsWith(".shp")) {
    return parseShapefile(file);
  }
  throw new Error(
    `Formato no soportado: "${file.name}". Acepta .geojson, .json, .zip o .shp.`,
  );
}

// -----------------------------------------------------------------------------
// Validación + construcción de propuesta final
// -----------------------------------------------------------------------------

/** Procesa una FeatureCollection a un ResumenImportacion listo para la API */
export function buildResumenImportacion(fc: FeatureCollection): ResumenImportacion {
  const advertencias: string[] = [];
  const propuestas: PropuestaImportada[] = [];
  let puntos = 0;
  let lineas = 0;
  let poligonos = 0;
  let bboxGlobal: [number, number, number, number] | null = null;

  fc.features.forEach((f, idx) => {
    const p = featureToPropuesta(f, idx, advertencias);
    if (!p) return;
    if (p.tipo === "punto") puntos += 1;
    else if (p.tipo === "linea") lineas += 1;
    else poligonos += 1;
    if (!bboxGlobal) {
      bboxGlobal = [...p.metricas.bbox] as [number, number, number, number];
    } else {
      bboxGlobal = [
        Math.min(bboxGlobal[0], p.metricas.bbox[0]),
        Math.min(bboxGlobal[1], p.metricas.bbox[1]),
        Math.max(bboxGlobal[2], p.metricas.bbox[2]),
        Math.max(bboxGlobal[3], p.metricas.bbox[3]),
      ];
    }
    propuestas.push(p);
  });

  return {
    total: propuestas.length,
    puntos,
    lineas,
    poligonos,
    propuestas,
    advertencias,
    bbox: bboxGlobal,
  };
}

// -----------------------------------------------------------------------------
// Serialización para API (lo que se envía al endpoint POST)
// -----------------------------------------------------------------------------

/** Item que se envía al backend — geometría simplificada */
export interface ImportPayloadItem {
  tipo: TipoPropuesta;
  actividad: string;
  componente: ComponenteKey;
  accion: AccionKey;
  id_predio: number | null;
  id_quebrada: number | null;
  nombre: string;
  geometry: Point | LineString | Polygon;
}

export interface ImportPayload {
  fuente: string;
  total: number;
  bbox: [number, number, number, number] | null;
  items: ImportPayloadItem[];
}

export function toImportPayload(
  resumen: ResumenImportacion,
  fuente: string,
): ImportPayload {
  return {
    fuente,
    total: resumen.total,
    bbox: resumen.bbox,
    items: resumen.propuestas.map((p) => ({
      tipo: p.tipo,
      actividad: p.actividad,
      componente: p.componente,
      accion: p.accion,
      id_predio: p.id_predio,
      id_quebrada: p.id_quebrada,
      nombre: p.nombre,
      geometry: p.geometry,
    })),
  };
}

// -----------------------------------------------------------------------------
// Pretty / formato de métricas para UI
// -----------------------------------------------------------------------------

export function formatAreaHa(area?: number): string {
  if (area === undefined) return "—";
  if (area < 0.01) return `${Math.round(area * 10_000)} m²`;
  if (area < 1) return `${(area * 10_000).toFixed(0)} m²`;
  return `${area.toFixed(2)} ha`;
}

export function formatLongitudM(longitud?: number): string {
  if (longitud === undefined) return "—";
  if (longitud < 1_000) return `${longitud.toFixed(2)} m`;
  return `${(longitud / 1000).toFixed(2)} km`;
}

export function formatBbox(bbox: [number, number, number, number] | null): string {
  if (!bbox) return "—";
  const [minX, minY, maxX, maxY] = bbox;
  return `${minX.toFixed(4)}, ${minY.toFixed(4)} → ${maxX.toFixed(4)}, ${maxY.toFixed(4)}`;
}