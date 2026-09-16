// =============================================================================
// Catálogo canónico de ACCIONES del convenio (T1 — sub-filtro por acción)
//
// 5 acciones visibles:
//   C1A1 = C1 + A1
//   C1A2 = C1 + A2
//   C2A1 = C2 + A1
//   C2A2 = C2 + A2
//   C3AU = C3 + U  (también incluye A1 — convención del cliente)
//
// Esta capa es la ÚNICA fuente de verdad para los códigos CxAy. La vista de
// metas (sgs_v_indicador_*) usa las acciones en BD (A1/A2/U) pero el UI solo
// expone los códigos de este catálogo — nunca el id_accion numérico.
//
// Filtros SQL por código de acción usan IN (string[]):
//   WHERE a.nombre IN ('U', 'A1')   -- C3AU
//   WHERE c.nombre = 'C1' AND a.nombre = 'A1'   -- C1A1
//
// Helper principal: `codigoAccionPara(componente, nombreAccion)` mapea
// (componente, nombre en BD) al código visible. La convención "C3 = U+A1"
// vive SOLO en este archivo.
// =============================================================================

export type ComponenteKey = "C1" | "C2" | "C3";

export type AccionCode = "C1A1" | "C1A2" | "C2A1" | "C2A2" | "C3AU";

export interface AccionDef {
  code: AccionCode;
  componente: ComponenteKey;
  /** Nombres en `sgs_com_accion` que mapean a este código. C3AU tiene dos. */
  nombres: string[];
  /** Etiqueta corta que se muestra en el chip del UI. */
  label: string;
}

export const ACCIONES: readonly AccionDef[] = [
  { code: "C1A1", componente: "C1", nombres: ["A1"],                  label: "C1A1" },
  { code: "C1A2", componente: "C1", nombres: ["A2"],                  label: "C1A2" },
  { code: "C2A1", componente: "C2", nombres: ["A1"],                  label: "C2A1" },
  { code: "C2A2", componente: "C2", nombres: ["A2"],                  label: "C2A2" },
  { code: "C3AU", componente: "C3", nombres: ["U", "A1"],             label: "C3AU" },
] as const;

export const COMPONENTES_VALIDOS: readonly ComponenteKey[] = ["C1", "C2", "C3"] as const;

/**
 * Valida y normaliza un valor de searchParam a código de acción.
 * Devuelve `null` si el valor no es un código válido.
 */
export function normalizarAccion(v: unknown): AccionCode | null {
  if (typeof v !== "string") return null;
  const u = v.toUpperCase();
  return ACCIONES.some((a) => a.code === u) ? (u as AccionCode) : null;
}

/**
 * Devuelve los códigos de acción para un componente dado.
 * - `null` → "Todas" → [] (caller decide "no aplicar filtro")
 * - "C3"  → ["C3AU"]
 * - "C1"  → ["C1A1", "C1A2"]
 */
export function accionesDeComponente(c: ComponenteKey | null): AccionCode[] {
  if (!c) return [];
  return ACCIONES.filter((a) => a.componente === c).map((a) => a.code);
}

/**
 * Devuelve el componente asociado a un código de acción.
 */
export function componenteDeAccion(code: AccionCode): ComponenteKey {
  const def = ACCIONES.find((a) => a.code === code);
  if (!def) throw new Error(`AccionCode desconocido: ${code}`);
  return def.componente;
}

/**
 * Devuelve la definición del catálogo por código.
 */
export function accionDef(code: AccionCode): AccionDef {
  const def = ACCIONES.find((a) => a.code === code);
  if (!def) throw new Error(`AccionCode desconocido: ${code}`);
  return def;
}

/**
 * Mapea (componente, nombre_accion en BD) al código visible.
 * Si el componente es C3 y el nombre es "U" o "A1" → "C3AU".
 * Devuelve `null` si la combinación no está en el catálogo.
 */
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
