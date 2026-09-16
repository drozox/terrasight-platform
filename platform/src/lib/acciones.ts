// =============================================================================
// acciones.ts — Catálogo canónico de ACCIONES del convenio.
//
// El filtro es jerárquico:
//   Todas → C1 → {C1A1, C1A2} · C2 → {C2A1, C2A2} · C3 → {C3AU}
//
// IMPORTANTE (modelo de datos): se filtra por (componente.nombre, accion.nombre),
// NUNCA por `id_accion` numérico (es un surrogate que puede diferir por entorno).
// C3 tiene una sola acción visual "C3AU" que agrupa A1 y U.
//
// Filtros SQL por código de acción usan IN (string[]):
//   WHERE a.nombre IN ('U', 'A1')               -- C3AU
//   WHERE c.nombre = 'C1' AND a.nombre = 'A1'   -- C1A1
// =============================================================================

export type ComponenteKey = "C1" | "C2" | "C3";
export type AccionCode = "C1A1" | "C1A2" | "C2A1" | "C2A2" | "C3AU";

export interface AccionDef {
  code: AccionCode;
  componente: ComponenteKey;
  /** Nombres en `sgs_com_accion` que mapean a este código. C3AU tiene dos. */
  nombres: string[];
  /** Alias de `nombres` (compatibilidad con el filtro del dashboard). */
  acciones: string[];
  /** Etiqueta corta que se muestra en el chip del UI. */
  label: string;
}

export const ACCIONES: readonly AccionDef[] = [
  { code: "C1A1", componente: "C1", nombres: ["A1"], acciones: ["A1"], label: "C1A1" },
  { code: "C1A2", componente: "C1", nombres: ["A2"], acciones: ["A2"], label: "C1A2" },
  { code: "C2A1", componente: "C2", nombres: ["A1"], acciones: ["A1"], label: "C2A1" },
  { code: "C2A2", componente: "C2", nombres: ["A2"], acciones: ["A2"], label: "C2A2" },
  { code: "C3AU", componente: "C3", nombres: ["U", "A1"], acciones: ["U", "A1"], label: "C3AU" },
];

export const COMPONENTES_VALIDOS: readonly ComponenteKey[] = ["C1", "C2", "C3"] as const;

const BY_CODE = Object.fromEntries(ACCIONES.map((a) => [a.code, a])) as Record<
  AccionCode,
  AccionDef
>;

/** Valida y normaliza un valor a código de acción. Null si no es válido. */
export function normalizarAccion(v?: string | null): AccionCode | null {
  if (typeof v !== "string") return null;
  const u = v.toUpperCase();
  return u in BY_CODE ? (u as AccionCode) : null;
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

/** Alias tolerante a null/undefined de `codigoDePropuesta`. */
export function codigoAccionPara(
  componente: string | null | undefined,
  nombreAccion: string | null | undefined,
): AccionCode | null {
  if (!componente || !nombreAccion) return null;
  const c = componente.toUpperCase() as ComponenteKey;
  if (!COMPONENTES_VALIDOS.includes(c)) return null;
  const def = ACCIONES.find(
    (a) => a.componente === c && a.nombres.includes(nombreAccion.toUpperCase()),
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
