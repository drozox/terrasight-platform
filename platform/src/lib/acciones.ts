// =============================================================================
// acciones.ts — Catálogo canónico de ACCIONES del convenio.
//
// El filtro del dashboard es jerárquico:
//   Todas → C1 → {C1A1, C1A2} · C2 → {C2A1, C2A2} · C3 → {C3AU}
//
// IMPORTANTE (modelo de datos): se filtra por (componente.nombre, accion.nombre),
// NUNCA por `id_accion` numérico (es un surrogate que puede diferir por entorno).
// C3 tiene una sola acción visual "C3AU" que agrupa A1 y U.
// =============================================================================

export type ComponenteKey = "C1" | "C2" | "C3";
export type AccionCode = "C1A1" | "C1A2" | "C2A1" | "C2A2" | "C3AU";

export interface AccionDef {
  code: AccionCode;
  componente: ComponenteKey;
  /** Nombres de acción en `sgs_com_accion.nombre` que componen este código. */
  acciones: string[];
}

export const ACCIONES: AccionDef[] = [
  { code: "C1A1", componente: "C1", acciones: ["A1"] },
  { code: "C1A2", componente: "C1", acciones: ["A2"] },
  { code: "C2A1", componente: "C2", acciones: ["A1"] },
  { code: "C2A2", componente: "C2", acciones: ["A2"] },
  { code: "C3AU", componente: "C3", acciones: ["U", "A1"] },
];

const BY_CODE = Object.fromEntries(ACCIONES.map((a) => [a.code, a])) as Record<
  AccionCode,
  AccionDef
>;

export function normalizarAccion(v?: string | null): AccionCode | null {
  return v && v in BY_CODE ? (v as AccionCode) : null;
}

export function accionDef(code: AccionCode): AccionDef {
  return BY_CODE[code];
}

export function componenteDeAccion(code: AccionCode): ComponenteKey {
  return BY_CODE[code].componente;
}

/** Acciones (sub-filtros) que cuelgan de un componente: C1 → [C1A1, C1A2]. */
export function accionesDeComponente(componente: string): AccionDef[] {
  return ACCIONES.filter((a) => a.componente === componente);
}

/**
 * Dado un (componente, nombre de acción) de una propuesta, devuelve su código
 * canónico. C3+A1 y C3+U → "C3AU". Devuelve null si no mapea.
 */
export function codigoDePropuesta(
  componente: string,
  accionNombre: string,
): AccionCode | null {
  const def = ACCIONES.find(
    (a) => a.componente === componente && a.acciones.includes(accionNombre),
  );
  return def ? def.code : null;
}

/** Componente al que pertenece un código de acción (helper para el filtro). */
export function componenteEfectivo(
  accion: AccionCode | null,
  componente: string | null,
): string | null {
  if (accion) return componenteDeAccion(accion);
  return componente;
}
