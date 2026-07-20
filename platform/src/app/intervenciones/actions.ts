"use server";

// =============================================================================
// Server Actions para /intervenciones (HU-TC-04, HU-IC-04)
// Cambia estado y/o registra avance de la propuesta.
// ADMIN | GESTOR pueden editar.
// =============================================================================

import { revalidatePath } from "next/cache";
import { safeParseForm } from "@/lib/validation";
import { requireRole, getCurrentUser } from "@/lib/auth-guard";
import {
  setIntervencionEstado,
  agregarAvancePropuesta,
} from "@/lib/repos";
import { isEstadoIntervencion } from "@/lib/constants";
import type { EstadoIntervencion } from "@/lib/types";

type Result =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function cambiarEstadoIntervencionAction(formData: FormData): Promise<Result> {
  await requireRole(["ADMIN", "GESTOR"] as const);

  const parsed = safeParseForm(formData, {
    idPropuesta: { name: "idPropuesta", required: true,  type: "number", integer: true, min: 1 },
    estado:      { name: "estado",      required: true,  type: "enum", values: ["Pendiente", "En ejecución", "Finalizada"] },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const data = parsed.data as Record<string, unknown>;
  const idPropuesta = Number(data.idPropuesta);
  const estadoStr = String(data.estado);
  if (!isEstadoIntervencion(estadoStr)) {
    return { ok: false, message: `Estado inválido: ${estadoStr}` };
  }

  try {
    await setIntervencionEstado(idPropuesta, estadoStr as EstadoIntervencion);
    revalidatePath("/intervenciones");
    revalidatePath(`/intervenciones/${idPropuesta}`);
    return { ok: true, message: `Estado actualizado a "${estadoStr}".` };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo cambiar el estado." };
  }
}

// -----------------------------------------------------------------------------
// actualizarAvanceIntervencionAction (HU-IC-04)
//
// Registra un evento de avance porcentual en el histórico de la propuesta.
// Si la propuesta llega a 100%, sincroniza el `estado` a 'Finalizada'.
// -----------------------------------------------------------------------------
export async function actualizarAvanceIntervencionAction(formData: FormData): Promise<Result> {
  const user = await requireRole(["ADMIN", "GESTOR"] as const);

  const parsed = safeParseForm(formData, {
    idPropuesta: { name: "idPropuesta", required: true,  type: "number", integer: true, min: 1 },
    avancePct:   { name: "avancePct",   required: true,  type: "number", integer: true, min: 0, max: 100 },
    nota:        { name: "nota",        required: false, type: "string", max: 2000 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const data = parsed.data as Record<string, unknown>;
  const idPropuesta = Number(data.idPropuesta);
  const avancePct   = Number(data.avancePct);
  const nota        = data.nota == null ? "" : String(data.nota);

  try {
    const fresh = await agregarAvancePropuesta({
      idPropuesta,
      avancePct,
      nota,
      idUsuario: user.idUsuario,
    });
    revalidatePath("/intervenciones");
    revalidatePath(`/intervenciones/${idPropuesta}`);
    return {
      ok: true,
      message: `Avance registrado: ${fresh.avancePct}%${nota ? " — " + nota.slice(0, 60) : ""}.`,
    };
  } catch (err) {
    const msg = (err as Error).message ?? "No se pudo registrar el avance.";
    // Mensajes específicos para los errores más comunes de la tabla.
    if (/chk.*pct|check constraint|23514/i.test(msg)) {
      return { ok: false, message: "El avance debe estar entre 0 y 100." };
    }
    if (/foreign key|23503/i.test(msg)) {
      return { ok: false, message: "La propuesta indicada no existe." };
    }
    return { ok: false, message: msg };
  }
}

// -----------------------------------------------------------------------------
// agregarNotaAvanceAction — atajo: registra un evento sin cambiar el % de
// avance (lo deja igual al actual). Útil para que el gestor agregue contexto
// sin tener que volver a tipear el porcentaje.
// -----------------------------------------------------------------------------
export async function agregarNotaAvanceAction(formData: FormData): Promise<Result> {
  const user = await requireRole(["ADMIN", "GESTOR"] as const);

  const parsed = safeParseForm(formData, {
    idPropuesta: { name: "idPropuesta", required: true,  type: "number", integer: true, min: 1 },
    avancePct:   { name: "avancePct",   required: true,  type: "number", integer: true, min: 0, max: 100 },
    nota:        { name: "nota",        required: true,  type: "string", min: 1, max: 2000 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const data = parsed.data as Record<string, unknown>;
  const idPropuesta = Number(data.idPropuesta);
  const avancePct   = Number(data.avancePct);
  const nota        = String(data.nota);

  try {
    await agregarAvancePropuesta({
      idPropuesta,
      avancePct,
      nota,
      idUsuario: user.idUsuario,
    });
    revalidatePath("/intervenciones");
    revalidatePath(`/intervenciones/${idPropuesta}`);
    return { ok: true, message: "Nota agregada al histórico." };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo agregar la nota." };
  }
}
