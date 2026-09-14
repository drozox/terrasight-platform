// =============================================================================
// centroid.ts — utilidades puras para ubicar geometrías en el mini-mapa.
//
// Necesario porque las geometrías del convenio son **Multi*** (MultiLineString,
// MultiPolygon), y sus `coordinates` vienen ANIDADAS. El cálculo ingenuo daba
// NaN y Leaflet crasheaba ("Invalid LatLng object") en /intervenciones/[id].
//
// `flattenPairs` aplana cualquier profundidad de anidamiento (LineString,
// MultiLineString, Polygon, MultiPolygon) a pares [lon, lat].
// =============================================================================

export type Pair = [number, number];
export interface Bbox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

/** Aplana coordenadas GeoJSON de cualquier tipo a pares [lon, lat]. */
export function flattenPairs(coords: unknown): Pair[] {
  const out: Pair[] = [];
  const walk = (c: unknown) => {
    if (!Array.isArray(c)) return;
    if (c.length >= 2 && typeof c[0] === "number" && typeof c[1] === "number") {
      out.push([c[0] as number, c[1] as number]);
      return;
    }
    for (const x of c) walk(x);
  };
  walk(coords);
  return out;
}

/** Bbox de una lista de pares. Devuelve null si está vacía. */
export function bboxOf(pairs: Pair[]): Bbox | null {
  if (pairs.length === 0) return null;
  let minLon = pairs[0][0];
  let maxLon = pairs[0][0];
  let minLat = pairs[0][1];
  let maxLat = pairs[0][1];
  for (const [lon, lat] of pairs) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLon, minLat, maxLon, maxLat };
}

/**
 * Centro [lat, lon] + zoom aproximado a partir de coordenadas GeoJSON de
 * cualquier tipo. Cae al `fallback` si no hay coordenadas válidas o el cálculo
 * da NaN (protege a Leaflet de "Invalid LatLng object").
 */
export function centerAndZoomFromCoords(
  coords: unknown,
  fallback: { center: Pair; zoom: number },
): { center: Pair; zoom: number } {
  const bb = bboxOf(flattenPairs(coords));
  if (!bb) return fallback;
  const center: Pair = [(bb.minLat + bb.maxLat) / 2, (bb.minLon + bb.maxLon) / 2];
  if (!Number.isFinite(center[0]) || !Number.isFinite(center[1])) return fallback;
  const diag = Math.hypot(bb.maxLon - bb.minLon, bb.maxLat - bb.minLat);
  let zoom = fallback.zoom;
  if (diag > 1) zoom = 9;
  else if (diag > 0.1) zoom = 11;
  else if (diag > 0.01) zoom = 13;
  else if (diag > 0.001) zoom = 15;
  else zoom = 16;
  return { center, zoom };
}
