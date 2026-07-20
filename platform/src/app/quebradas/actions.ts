"use server";

// =============================================================================
// Server Actions para /quebradas (HU-TC-02)
//
// Role: ADMIN | GESTOR pueden escribir. ANALISTA es read-only.
// =============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeParseForm } from "@/lib/validation";
import { requireRole } from "@/lib/auth-guard";
import {
  crearQuebrada,
  actualizarQuebrada,
  eliminarQuebrada,
} from "@/lib/repos";
import type { QuebradaFull } from "@/lib/types";

type Result =
  | { ok: true; message: string; idQuebrada?: number }
  | { ok: false; message: string; field?: string };

// -----------------------------------------------------------------------------
// Crear
// -----------------------------------------------------------------------------
export async function crearQuebradaAction(formData: FormData): Promise<Result> {
  await requireRole(["ADMIN", "GESTOR"] as const);

  const parsed = safeParseForm(formData, {
    nombreQuebrada: { name: "nombreQuebrada", required: true, type: "string", min: 2, max: 255 },
    latitud:        { name: "latitud",        required: true, type: "number", min: -90, max: 90 },
    longitud:       { name: "longitud",       required: true, type: "number", min: -180, max: 180 },
    area:           { name: "area",           required: false, type: "number", min: 0 },
    idMunicipio:    { name: "idMunicipio",    required: false, type: "number", integer: true, min: 1 },
    idMicrocuenca:  { name: "idMicrocuenca",  required: false, type: "number", integer: true, min: 1 },
  });

  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as Record<string, unknown>;
  const input: Omit<QuebradaFull, "idQuebrada"> = {
    nombreQuebrada: String(data.nombreQuebrada),
    latitud:        Number(data.latitud),
    longitud:       Number(data.longitud),
    area:           data.area == null ? 0 : Number(data.area),
    idMunicipio:    data.idMunicipio == null ? null : Number(data.idMunicipio),
    idMicrocuenca:  data.idMicrocuenca == null ? null : Number(data.idMicrocuenca),
  };

  try {
    const fresh = await crearQuebrada(input);
    revalidatePath("/quebradas");
    return { ok: true, message: `Quebrada ${fresh.nombreQuebrada} creada.`, idQuebrada: fresh.idQuebrada };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo crear la quebrada." };
  }
}

// -----------------------------------------------------------------------------
// Actualizar
// -----------------------------------------------------------------------------
export async function actualizarQuebradaAction(formData: FormData): Promise<Result> {
  await requireRole(["ADMIN", "GESTOR"] as const);

  const parsed = safeParseForm(formData, {
    idQuebrada:     { name: "idQuebrada",     required: true,  type: "number", integer: true, min: 1 },
    nombreQuebrada: { name: "nombreQuebrada", required: true,  type: "string", min: 2, max: 255 },
    latitud:        { name: "latitud",        required: true,  type: "number", min: -90, max: 90 },
    longitud:       { name: "longitud",       required: true,  type: "number", min: -180, max: 180 },
    area:           { name: "area",           required: false, type: "number", min: 0 },
    idMunicipio:    { name: "idMunicipio",    required: false, type: "number", integer: true, min: 1 },
    idMicrocuenca:  { name: "idMicrocuenca",  required: false, type: "number", integer: true, min: 1 },
  });

  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as Record<string, unknown>;
  const idQuebrada = Number(data.idQuebrada);

  try {
    await actualizarQuebrada(idQuebrada, {
      nombreQuebrada: String(data.nombreQuebrada),
      latitud:        Number(data.latitud),
      longitud:       Number(data.longitud),
      area:           data.area == null ? 0 : Number(data.area),
      idMunicipio:    data.idMunicipio == null ? null : Number(data.idMunicipio),
      idMicrocuenca:  data.idMicrocuenca == null ? null : Number(data.idMicrocuenca),
    });
    revalidatePath("/quebradas");
    revalidatePath(`/quebradas/${idQuebrada}`);
    return { ok: true, message: "Quebrada actualizada.", idQuebrada };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo actualizar." };
  }
}

// -----------------------------------------------------------------------------
// Eliminar
// -----------------------------------------------------------------------------
export async function eliminarQuebradaAction(formData: FormData): Promise<Result> {
  await requireRole(["ADMIN", "GESTOR"] as const);

  const parsed = safeParseForm(formData, {
    idQuebrada: { name: "idQuebrada", required: true, type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const idQuebrada = Number((parsed.data as Record<string, unknown>).idQuebrada);
  try {
    await eliminarQuebrada(idQuebrada);
    revalidatePath("/quebradas");
    return { ok: true, message: "Quebrada eliminada." };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    // 23503: foreign_key_violation cuando hay propuestas o relaciones
    if (/foreign key|23503/i.test(msg)) {
      return { ok: false, message: "La quebrada tiene propuestas asociadas; no se puede eliminar." };
    }
    return { ok: false, message: msg || "No se pudo eliminar la quebrada." };
  }
}

// Helper para que la page de alta pueda hacer server-side redirect
// sin pasar el resultado por useActionState.
export async function crearQuebradaYRedirigir(formData: FormData): Promise<void> {
  const res = await crearQuebradaAction(formData);
  if (!res.ok) {
    const err = encodeURIComponent(res.message);
    redirect(`/quebradas/nuevo?error=${err}&field=${res.field ?? ""}`);
  }
  if (res.idQuebrada) redirect(`/quebradas/${res.idQuebrada}`);
}
