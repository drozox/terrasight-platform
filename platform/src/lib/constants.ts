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
  R1: "Listado completo de predios",
  R2: "Predios con coberturas y biomas",
  R4: "Propuestas por predio",
  R6: "Zonificaciones por predio",
  R7: "Infraestructura vial",
  R10: "Área total de conservación por bioma",
  R11: "Cobertura territorial por componente y acción",
};

export const REPORTE_DESCRIPCIONES: Record<ReporteTipo, string> = {
  R1: "Lista los predios con propietario, vereda, municipio, cédula catastral y área. Útil para cruce con catastro IGAC.",
  R2: "Predios con sus coberturas CLC (CORINE Land Cover) y biomas IAVH asociados, agregados como listas separadas por coma. Útil para análisis de uso del suelo.",
  R4: "Lista completa de predios. Cada predio tiene el detalle de sus intervenciones (tipo, actividad, estado, área/longitud).",
  R6: "Predios con vereda, núcleo predial y sus zonificaciones ambientales (POMCA, RFP y páramos).",
  R7: "Inventario de infraestructura vial (vías) por municipio, con tipos y conteos.",
  R10: "Área total de predios por bioma IAVH, con conteo de predios y área promedio. Para reportes de conservación.",
  R11: "Cobertura territorial: predios y área por municipio y vereda para el componente/acción seleccionado.",
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

// ESTADOS_VALIDOS viene del workflow (migration 33 / Sprint 20).
// Re-exportado acá para mantener compatibilidad con código que importa de
// `constants.ts`. Es el vocabulario que pasa el CHECK constraint de
// `sgs_pro_propuesta.estado` (chk_pro_estado).
const ESTADOS_VALIDOS: readonly EstadoIntervencion[] = [
  "BORRADOR",
  "EN_REVISION",
  "APROBADA",
  "EN_EJECUCION",
  "FINALIZADA",
  "RECHAZADA",
];

export function isEstadoIntervencion(s: string): s is EstadoIntervencion {
  return (ESTADOS_VALIDOS as readonly string[]).includes(s);
}
