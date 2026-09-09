// =============================================================================
// workflow — máquina de estados para sgs_pro_propuesta
//
// Sprint 20 (P0 del plan v1.0) — workflow real de aprobación de intervenciones.
//
// Estados (6):
//   BORRADOR     creada por GESTOR, editable
//   EN_REVISION  enviada para revisión, bloqueada para edición
//   APROBADA     aprobada por ADMIN/ANALISTA, lista para ejecutar
//   EN_EJECUCION en ejecución
//   FINALIZADA   completada (terminal salvo re-apertura manual)
//   RECHAZADA    rechazada en revisión (re-abrible a BORRADOR)
//
// Transiciones válidas y roles permitidos:
//
//   BORRADOR      → EN_REVISION       (GESTOR submit)
//   EN_REVISION   → APROBADA          (ADMIN/ANALISTA approve)
//   EN_REVISION   → RECHAZADA         (ADMIN/ANALISTA reject)
//   APROBADA      → EN_EJECUCION      (GESTOR start)
//   EN_EJECUCION  → FINALIZADA        (GESTOR/ADMIN finish)
//   EN_EJECUCION  → BORRADOR          (GESTOR/ADMIN re-open)
//   RECHAZADA     → BORRADOR          (GESTOR/ADMIN re-open)
//
// Cada transición se registra en sgs_pro_estado_historial con auditoría
// completa (usuario, rol, comentario, timestamp).
//
// Tipos y constantes puras (sin DB) viven en workflow-types.ts para que los
// componentes "use client" puedan importarlos sin arrastrar postgres-js.
// =============================================================================

import { sql, pgInt } from "../db";
import {
  getTransicion as getTransicionPure,
  type EstadoPropuesta,
  type RolUsuario,
  type Transicion,
  type HistorialEntry,
} from "./workflow-types";

// Re-exportar lo que ya viene de workflow-types
export {
  ESTADOS,
  ESTADO_LABEL,
  ESTADO_COLOR,
  getTransiciones,
  getTransicion,
  type EstadoPropuesta,
  type RolUsuario,
  type Transicion,
  type HistorialEntry,
} from "./workflow-types";

// -----------------------------------------------------------------------------
// Operaciones server-side
// -----------------------------------------------------------------------------

export interface TransicionResult {
  ok: boolean;
  id_propuesta: number;
  estado_anterior: EstadoPropuesta;
  estado_nuevo: EstadoPropuesta;
  error?: string;
}

/** Devuelve el historial de una propuesta. */
export async function getHistorial(idPropuesta: number): Promise<HistorialEntry[]> {
  const rows = await sql<Array<{
    id_historial: number;
    estado_anterior: string | null;
    estado_nuevo: string;
    usuario: string | null;
    rol: string | null;
    comentario: string | null;
    created_at: string;
  }>>`
    SELECT id_historial, estado_anterior, estado_nuevo, usuario, rol, comentario, created_at
    FROM sgs_pro_estado_historial
    WHERE id_propuesta = ${idPropuesta}
    ORDER BY created_at DESC, id_historial DESC
  `;
  return rows.map((r) => ({
    id_historial: pgInt(r.id_historial),
    estado_anterior: r.estado_anterior as EstadoPropuesta | null,
    estado_nuevo: r.estado_nuevo as EstadoPropuesta,
    usuario: r.usuario,
    rol: r.rol,
    comentario: r.comentario,
    created_at: r.created_at,
  }));
}

/**
 * Aplica una transición de estado validando:
 *   - La transición es válida (existe en TRANSICIONES)
 *   - El rol del usuario puede hacerla
 *   - comentario es obligatorio si la transición lo requiere
 *
 * En una transacción:
 *   1. UPDATE sgs_pro_propuesta SET estado = $to WHERE id_propuesta = $id AND estado = $from
 *      (la condición WHERE protege contra race conditions)
 *   2. INSERT en sgs_pro_estado_historial
 *
 * Si el UPDATE afecta 0 filas, retorna error (estado cambió entre lectura y update).
 */
export async function aplicarTransicion(opts: {
  idPropuesta: number;
  from: EstadoPropuesta;
  to: EstadoPropuesta;
  rol: RolUsuario;
  usuario: string;
  comentario?: string;
}): Promise<TransicionResult> {
  const trans = getTransicionPure(opts.from, opts.to);
  if (!trans) {
    return {
      ok: false,
      id_propuesta: opts.idPropuesta,
      estado_anterior: opts.from,
      estado_nuevo: opts.to,
      error: `Transición ${opts.from} → ${opts.to} no permitida`,
    };
  }
  if (!trans.roles.includes(opts.rol)) {
    return {
      ok: false,
      id_propuesta: opts.idPropuesta,
      estado_anterior: opts.from,
      estado_nuevo: opts.to,
      error: `Tu rol (${opts.rol}) no puede ${trans.label.toLowerCase()}. Roles permitidos: ${trans.roles.join(", ")}`,
    };
  }
  if (trans.requiresComment && !opts.comentario?.trim()) {
    return {
      ok: false,
      id_propuesta: opts.idPropuesta,
      estado_anterior: opts.from,
      estado_nuevo: opts.to,
      error: `Esta transición requiere un comentario de justificación`,
    };
  }

  // Update + insert atómico
  const updated = await sql<{ id_propuesta: number }[]>`
    UPDATE sgs_pro_propuesta
    SET estado = ${opts.to}
    WHERE id_propuesta = ${opts.idPropuesta} AND estado = ${opts.from}
    RETURNING id_propuesta
  `;

  if (updated.length === 0) {
    return {
      ok: false,
      id_propuesta: opts.idPropuesta,
      estado_anterior: opts.from,
      estado_nuevo: opts.to,
      error: `El estado cambió entre la lectura y el update. Recarga la página.`,
    };
  }

  await sql`
    INSERT INTO sgs_pro_estado_historial
      (id_propuesta, estado_anterior, estado_nuevo, usuario, rol, comentario)
    VALUES
      (${opts.idPropuesta}, ${opts.from}, ${opts.to}, ${opts.usuario}, ${opts.rol}, ${opts.comentario ?? null})
  `;

  return {
    ok: true,
    id_propuesta: opts.idPropuesta,
    estado_anterior: opts.from,
    estado_nuevo: opts.to,
  };
}
