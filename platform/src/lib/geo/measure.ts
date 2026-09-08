// =============================================================================
// Measure — helpers puros para medición geodésica
//
// Sprint 18.1 — Medir distancia (línea) y área (polígono) en geometría WGS84.
// Las funciones usan la fórmula de Vincenty inversa (más precisa que
// haversine para distancias grandes) y la fórmula del excedente esférico
// para área. Los valores son exactos para el cálculo en el cliente, pero
// el "ground truth" siempre es el cálculo de PostGIS con ST_Length y
// ST_Area sobre `::geography` (ver /api/geo/measure).
//
// Por qué Vincenty en vez de haversine: precisión < 1m en distancias hasta
// ~500 km. Para el convenio CAR (Cundinamarca ~24k km²), es más que
// suficiente y evita un edge case conocido de haversine cerca del ecuador.
//
// Por qué fórmula del excedente esférico para área: O(n) en el número de
// vértices, suficiente para polígonos manuales < 100 puntos (mediciones
// en pantalla). Para polígonos de cobertura (CLC, RFP, etc.) siempre usar
// ST_Area(geom::gegeometry) en PostGIS.
// =============================================================================

import type { LngLat } from "@/components/map/map-types";

// WGS84
const WGS84_A = 6378137.0; // semi-major axis (m)
const WGS84_F = 1 / 298.257223563; // flattening
const WGS84_B = WGS84_A * (1 - WGS84_F); // semi-minor axis
const WGS84_E2 = 1 - (WGS84_B * WGS84_B) / (WGS84_A * WGS84_A); // eccentricity²

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Distancia geodésica entre 2 puntos (fórmula de Vincenty inversa).
 * Retorna metros. Precisión sub-milímetro en <100 km.
 */
export function vincentyDistance(a: LngLat, b: LngLat): number {
  if (a[0] === b[0] && a[1] === b[1]) return 0;
  const lon1 = a[0] * DEG_TO_RAD;
  const lat1 = a[1] * DEG_TO_RAD;
  const lon2 = b[0] * DEG_TO_RAD;
  const lat2 = b[1] * DEG_TO_RAD;

  const L = lon2 - lon1;
  const U1 = Math.atan((1 - WGS84_F) * Math.tan(lat1));
  const U2 = Math.atan((1 - WGS84_F) * Math.tan(lat2));
  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  let lambda = L;
  let lambdaP: number;
  let iterLimit = 100;
  let sinLambda = 0;
  let cosLambda = 0;
  let sinSigma = 0;
  let cosSigma = 0;
  let sigma = 0;
  let cosSqAlpha = 0;
  let cos2SigmaM = 0;

  do {
    sinLambda = Math.sin(lambda);
    cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      (cosU2 * sinLambda) ** 2 +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2,
    );
    if (sinSigma === 0) return 0; // coincident
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha ** 2;
    cos2SigmaM = cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha || 0;
    const C = (WGS84_F / 16) * cosSqAlpha * (4 + WGS84_F * (4 - 3 * cosSqAlpha));
    lambdaP = lambda;
    lambda =
      L +
      (1 - C) *
        WGS84_F *
        sinAlpha *
        (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));
  } while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);

  if (iterLimit === 0) {
    // No convergió — fallback a haversine (raro, latitudes casi antipodales)
    return haversineDistance(a, b);
  }

  const uSq = cosSqAlpha * (WGS84_A ** 2 - WGS84_B ** 2) / (WGS84_B ** 2);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma =
    B *
    sinSigma *
    (cos2SigmaM + (B / 4) * (cosSigma * (-1 + 2 * cos2SigmaM ** 2) - (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma ** 2) * (-3 + 4 * cos2SigmaM ** 2)));

  return WGS84_B * A * (sigma - deltaSigma);
}

/**
 * Haversine — fallback simple para casos extremos. Retorna metros.
 */
export function haversineDistance(a: LngLat, b: LngLat): number {
  const R = 6371008.8; // radio medio terrestre (m)
  const dLat = (b[1] - a[1]) * DEG_TO_RAD;
  const dLon = (b[0] - a[0]) * DEG_TO_RAD;
  const lat1 = a[1] * DEG_TO_RAD;
  const lat2 = b[1] * DEG_TO_RAD;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Longitud total de una polilínea abierta (suma de segmentos).
 * Retorna metros. Para polilínea con <2 puntos, retorna 0.
 */
export function polylineLength(points: LngLat[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += vincentyDistance(points[i - 1], points[i]);
  }
  return total;
}

/**
 * Área geodésica de un polígono (fórmula del excedente esférico).
 * Retorna metros². Para polígono con <3 puntos o abierto, retorna 0.
 *
 * Asume que el polígono es **cerrado** (último punto != primero). El llamador
 * debe encargarse de cerrar visualmente la polilínea al renderizar.
 */
export function polygonArea(points: LngLat[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [lon1, lat1] = points[i];
    const [lon2, lat2] = points[(i + 1) % points.length];
    area += DEG_TO_RAD * (lon2 - lon1) * (2 + Math.sin(lat1 * DEG_TO_RAD) + Math.sin(lat2 * DEG_TO_RAD));
  }
  return Math.abs((area * WGS84_A ** 2) / 2);
}

// Helpers de formato (compartidos con UI)

export function formatMeters(m: number): string {
  if (m < 1) return `${(m * 100).toFixed(0)} cm`;
  if (m < 1000) return `${m.toFixed(1)} m`;
  return `${(m / 1000).toFixed(3)} km`;
}

export function formatHectares(m2: number): string {
  const ha = m2 / 10_000;
  if (ha < 1) return `${m2.toFixed(0)} m²`;
  if (ha < 100) return `${ha.toFixed(2)} ha`;
  return `${ha.toFixed(1)} ha`;
}
