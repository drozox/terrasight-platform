"use server";

// =============================================================================
// Server Actions para /intervenciones (HU-TC-04)
// Cambia estado de la propuesta. ADMIN | GESTOR pueden editar.
// =============================================================================

import { revalidatePath } from "next/cache";
import { safeParseForm } from "@/lib/validation";
import { requireRole } from "@/lib/auth-guard";
import { setIntervencionEstado, isEstadoIntervencion, type EstadoIntervencion } from "@/lib/repository";

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
