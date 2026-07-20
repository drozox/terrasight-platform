// =============================================================================
// Constants client-safe
//
// Este archivo contiene SOLO values (constantes, records, arrays, type
// guards puros) que pueden importarse desde client components sin arrastrar
// `db.ts` → `postgres` al bundle del browser.
//
// Reglas:
//   - NO importar de `./db` ni de `./repos` (eso es server-only).
//   - NO tener código que dependa de runtime (Date.now, etc.) en valores
//     derivados de tipos.
// =============================================================================

import type {
  ComponenteValido,
  AccionValida,
  ReporteTipo,
  TipoPunto,
  EstadoIntervencion,
  BufferTarget,
} from "./types";

// -----------------------------------------------------------------------------
// Whitelists / catálogos cerrados
// -----------------------------------------------------------------------------

export const COMPONENTES_VALIDOS: readonly ComponenteValido[] = ["C1", "C2", "C3"] as const;
export const ACCIONES_VALIDAS: readonly AccionValida[] = ["A1", "A2"] as const;

export const TIPOS_PUNTO: readonly TipoPunto[] = [
  "obra_captacion",
  "estacion_limnimetrica",
  "bebedero",
  "tanque",
  "panel_solar",
] as const;

// -----------------------------------------------------------------------------
// Labels de catálogos (presentación UI)
// -----------------------------------------------------------------------------

export const TIPO_PUNTO_LABEL: Record<TipoPunto, string> = {
  obra_captacion: "Obra de captación",
  estacion_limnimetrica: "Estación limnimétrica",
  bebedero: "Bebedero",
  tanque: "Tanque",
  panel_solar: "Panel solar",
};

export const TIPO_PUNTO_COLOR: Record<
  TipoPunto,
  "primary" | "secondary" | "tertiary" | "warning" | "info"
> = {
  obra_captacion: "primary",
  estacion_limnimetrica: "info",
  bebedero: "secondary",
  tanque: "tertiary",
  panel_solar: "warning",
};

// -----------------------------------------------------------------------------
// Reportes (HU-CO-04)
// -----------------------------------------------------------------------------

export const REPORTE_LABELS: Record<ReporteTipo, string> = {
  R1: "R1 — Listado completo de predios",
  R2: "R2 — Predios con coberturas y biomas",
  R3: "R3 — Propuestas por componente y acción",
  R4: "R4 — Propuestas por predio",
  R5: "R5 — Propuestas punto con beneficiarios",
  R6: "R6 — Zonificaciones por predio",
  R7: "R7 — Infraestructura por municipio",
  R8: "R8 — Resumen de predios por componente",
  R9: "R9 — Quebradas con más propuestas",
  R10: "R10 — Área total de conservación por bioma",
};

export const REPORTE_DESCRIPCIONES: Record<ReporteTipo, string> = {
  R1: "Lista los predios con propietario, vereda, municipio, cédula catastral y área. Útil para cruce con catastro IGAC.",
  R2: "Predios con sus coberturas CLC (CORINE Land Cover) y biomas IAVH asociados, agregados como listas separadas por coma. Útil para análisis de uso del suelo.",
  R3: "Agrupa las propuestas por componente (C1/C2/C3) y acción (A1/A2). Muestra el total y desglose por tipo (punto/línea/polígono).",
  R4: "Detalle de cada propuesta asociada a un predio: tipo, actividad, componente, acción, quebrada y métrica específica (longitud / área / tipo de punto).",
  R5: "Propuestas de tipo punto con sus usuarios beneficiarios asociados y coordenadas (este/norte). Útil para trazabilidad social.",
  R6: "Predios con sus zonificaciones ambientales: POMCA, RFP y páramos. Lista agregada de categorías presentes por predio.",
  R7: "Inventario de infraestructura (vías, drenajes simples y dobles) por municipio, con tipos y conteos.",
  R8: "Resumen ejecutivo de predios con propuestas por componente, con totales por tipo. Para reportes de avance.",
  R9: "Top de quebradas con más propuestas asociadas, con desglose por tipo. Útil para priorizar inversión.",
  R10: "Área total de predios por bioma IAVH, con conteo de predios y área promedio. Para reportes de conservación.",
};

// -----------------------------------------------------------------------------
// Type guards puros (sin tocar BD). Son seguros para client components.
// -----------------------------------------------------------------------------

export function isTipoPunto(s: string): s is TipoPunto {
  return (TIPOS_PUNTO as readonly string[]).includes(s);
}

export function isBufferTarget(s: string): s is BufferTarget {
  return s === "quebrada" || s === "propuesta";
}

const ESTADOS_VALIDOS: readonly EstadoIntervencion[] = [
  "Pendiente",
  "En ejecución",
  "Finalizada",
];

export function isEstadoIntervencion(s: string): s is EstadoIntervencion {
  return (ESTADOS_VALIDOS as readonly string[]).includes(s);
}
