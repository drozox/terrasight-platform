// =============================================================================
// workflow-types — tipos, constantes y funciones puras (sin DB)
//
// Se separan de workflow.ts para que los componentes "use client" puedan
// importarlos sin arrastrar transitivamente el cliente de postgres-js (que
// usa módulos nativos de Node: net, tls, etc.).
// =============================================================================

export type EstadoPropuesta =
  | "BORRADOR"
  | "EN_REVISION"
  | "APROBADA"
  | "EN_EJECUCION"
  | "FINALIZADA"
  | "RECHAZADA";

export type RolUsuario = "ADMIN" | "ANALISTA" | "GESTOR";

export const ESTADOS: EstadoPropuesta[] = [
  "BORRADOR",
  "EN_REVISION",
  "APROBADA",
  "EN_EJECUCION",
  "FINALIZADA",
  "RECHAZADA",
];

/** Label legible para mostrar en UI. */
export const ESTADO_LABEL: Record<EstadoPropuesta, string> = {
  BORRADOR:      "Borrador",
  EN_REVISION:   "En revisión",
  APROBADA:      "Aprobada",
  EN_EJECUCION:  "En ejecución",
  FINALIZADA:    "Finalizada",
  RECHAZADA:     "Rechazada",
};

/** Color semántico (Tailwind classes) por estado. */
export const ESTADO_COLOR: Record<EstadoPropuesta, string> = {
  BORRADOR:      "bg-slate-100 text-slate-800",
  EN_REVISION:   "bg-amber-100 text-amber-800",
  APROBADA:      "bg-blue-100 text-blue-800",
  EN_EJECUCION:  "bg-emerald-100 text-emerald-800",
  FINALIZADA:    "bg-emerald-600 text-white",
  RECHAZADA:     "bg-red-100 text-red-800",
};

export interface Transicion {
  from: EstadoPropuesta;
  to: EstadoPropuesta;
  roles: RolUsuario[];
  label: string;
  description: string;
  requiresComment?: boolean;
}

export interface HistorialEntry {
  id_historial: number;
  estado_anterior: EstadoPropuesta | null;
  estado_nuevo: EstadoPropuesta;
  usuario: string | null;
  rol: string | null;
  comentario: string | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// State machine (función pura — sin DB)
// -----------------------------------------------------------------------------

const TRANSICIONES: Transicion[] = [
  {
    from: "BORRADOR", to: "EN_REVISION",
    roles: ["GESTOR"],
    label: "Enviar a revisión",
    description: "Enviar la propuesta al equipo técnico para su aprobación.",
  },
  {
    from: "EN_REVISION", to: "APROBADA",
    roles: ["ADMIN", "ANALISTA"],
    label: "Aprobar",
    description: "Aprobar la propuesta. Queda lista para iniciar ejecución.",
  },
  {
    from: "EN_REVISION", to: "RECHAZADA",
    roles: ["ADMIN", "ANALISTA"],
    label: "Rechazar",
    description: "Rechazar la propuesta con observaciones.",
    requiresComment: true,
  },
  {
    from: "APROBADA", to: "EN_EJECUCION",
    roles: ["GESTOR"],
    label: "Iniciar ejecución",
    description: "Marcar la propuesta como en ejecución.",
  },
  {
    from: "EN_EJECUCION", to: "FINALIZADA",
    roles: ["GESTOR", "ADMIN"],
    label: "Finalizar",
    description: "Marcar la propuesta como finalizada.",
  },
  {
    from: "EN_EJECUCION", to: "BORRADOR",
    roles: ["GESTOR", "ADMIN"],
    label: "Reabrir como borrador",
    description: "Reabrir la propuesta para edición.",
  },
  {
    from: "RECHAZADA", to: "BORRADOR",
    roles: ["GESTOR", "ADMIN"],
    label: "Reabrir como borrador",
    description: "Atender observaciones y reabrir para edición.",
  },
];

/** Devuelve las transiciones válidas desde un estado para un rol dado. */
export function getTransiciones(
  estado: EstadoPropuesta,
  rol: RolUsuario,
): Transicion[] {
  return TRANSICIONES.filter((t) => t.from === estado && t.roles.includes(rol));
}

/** Devuelve la info de una transición específica. */
export function getTransicion(
  from: EstadoPropuesta,
  to: EstadoPropuesta,
): Transicion | undefined {
  return TRANSICIONES.find((t) => t.from === from && t.to === to);
}
