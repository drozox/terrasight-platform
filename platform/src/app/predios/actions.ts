"use server";

// =============================================================================
// Server Actions para /predios (HU-TC-01)
//
// Role: ADMIN | GESTOR pueden escribir. ANALISTA es read-only.
//
// Validación: safeParseForm con schema declarativo.
// =============================================================================

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { safeParseForm } from "@/lib/validation";
import { requireRole } from "@/lib/auth-guard";
import {
  crearPredio,
  actualizarPredio,
  eliminarPredio,
} from "@/lib/repos";
import type { PredioFull } from "@/lib/types";

type Result =
  | { ok: true; message: string; idPredio?: number }
  | { ok: false; message: string; field?: string };

// -----------------------------------------------------------------------------
// Crear
// -----------------------------------------------------------------------------
export async function crearPredioAction(formData: FormData): Promise<Result> {
  await requireRole(["ADMIN", "GESTOR"] as const);

  const parsed = safeParseForm(formData, {
    nombrePredio:      { name: "nombrePredio",      required: true, type: "string", min: 2, max: 255 },
    cedulaCatastral:   { name: "cedulaCatastral",   required: true, type: "string", min: 1, max: 50 },
    cedulaAnt:         { name: "cedulaAnt",         required: true, type: "string", min: 1, max: 50 },
    nucleoPredial:     { name: "nucleoPredial",     required: true, type: "string", min: 1, max: 255 },
    idPropietario:     { name: "idPropietario",     required: true, type: "number", integer: true, min: 1 },
    idVereda:          { name: "idVereda",          required: true, type: "number", integer: true, min: 1 },
    areaHa:            { name: "areaHa",            required: true, type: "number", min: 0 },
    longitudCentroide: { name: "longitudCentroide", required: true, type: "number", min: -180, max: 180 },
    latitudCentroide:  { name: "latitudCentroide",  required: true, type: "number", min: -90, max: 90 },
    perimetro:         { name: "perimetro",         required: false, type: "number", min: 0 },
    observaciones:     { name: "observaciones",     required: false, type: "string", max: 2000 },
  });

  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as Record<string, unknown>;
  const input: Omit<PredioFull, "idPredio"> = {
    nombrePredio:      String(data.nombrePredio),
    cedulaCatastral:   String(data.cedulaCatastral),
    cedulaAnt:         String(data.cedulaAnt),
    nucleoPredial:     String(data.nucleoPredial),
    idPropietario:     Number(data.idPropietario),
    idVereda:          Number(data.idVereda),
    areaHa:            Number(data.areaHa),
    longitudCentroide: Number(data.longitudCentroide),
    latitudCentroide:  Number(data.latitudCentroide),
    perimetro:         data.perimetro == null ? 0 : Number(data.perimetro),
    observaciones:     data.observaciones == null ? "" : String(data.observaciones),
  };

  try {
    const fresh = await crearPredio(input);
    revalidateTag("predios");
    revalidateTag("dashboard");
    revalidateTag("mapa");
    revalidateTag("analisis");
    revalidateTag("reportes");
    revalidateTag("catalogos:lookup");
    revalidatePath("/predios");
    return { ok: true, message: `Predio ${fresh.nombrePredio} creado.`, idPredio: fresh.idPredio };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo crear el predio." };
  }
}

// -----------------------------------------------------------------------------
// Form action para "crear + redirect" — usado desde <form action={...}>
// -----------------------------------------------------------------------------
export async function crearPredioYRedirigir(formData: FormData): Promise<void> {
  const res = await crearPredioAction(formData);
  if (!res.ok) {
    // Si hay un error de validación, redirigimos con el mensaje en query
    // para que la página pueda mostrarlo. Es un compromiso aceptable para
    // una sola "página de alta"; si querés UX más prolija, movemos el
    // manejo de errores al client con useActionState.
    const err = encodeURIComponent(res.message);
    redirect(`/predios/nuevo?error=${err}&field=${res.field ?? ""}`);
  }
  if (res.idPredio) redirect(`/predios/${res.idPredio}`);
}

// -----------------------------------------------------------------------------
// Actualizar
// -----------------------------------------------------------------------------
export async function actualizarPredioAction(formData: FormData): Promise<Result> {
  await requireRole(["ADMIN", "GESTOR"] as const);

  const parsed = safeParseForm(formData, {
    idPredio:          { name: "idPredio",          required: true,  type: "number", integer: true, min: 1 },
    nombrePredio:      { name: "nombrePredio",      required: true,  type: "string", min: 2, max: 255 },
    cedulaCatastral:   { name: "cedulaCatastral",   required: true,  type: "string", min: 1, max: 50 },
    cedulaAnt:         { name: "cedulaAnt",         required: true,  type: "string", min: 1, max: 50 },
    nucleoPredial:     { name: "nucleoPredial",     required: true,  type: "string", min: 1, max: 255 },
    idPropietario:     { name: "idPropietario",     required: true,  type: "number", integer: true, min: 1 },
    idVereda:          { name: "idVereda",          required: true,  type: "number", integer: true, min: 1 },
    areaHa:            { name: "areaHa",            required: true,  type: "number", min: 0 },
    longitudCentroide: { name: "longitudCentroide", required: true,  type: "number", min: -180, max: 180 },
    latitudCentroide:  { name: "latitudCentroide",  required: true,  type: "number", min: -90, max: 90 },
    perimetro:         { name: "perimetro",         required: false, type: "number", min: 0 },
    observaciones:     { name: "observaciones",     required: false, type: "string", max: 2000 },
  });

  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as Record<string, unknown>;
  const idPredio = Number(data.idPredio);

  try {
    await actualizarPredio(idPredio, {
      nombrePredio:      String(data.nombrePredio),
      cedulaCatastral:   String(data.cedulaCatastral),
      cedulaAnt:         String(data.cedulaAnt),
      nucleoPredial:     String(data.nucleoPredial),
      idPropietario:     Number(data.idPropietario),
      idVereda:          Number(data.idVereda),
      areaHa:            Number(data.areaHa),
      longitudCentroide: Number(data.longitudCentroide),
      latitudCentroide:  Number(data.latitudCentroide),
      perimetro:         data.perimetro == null ? 0 : Number(data.perimetro),
      observaciones:     data.observaciones == null ? "" : String(data.observaciones),
    });
    revalidateTag("predios");
    revalidateTag("dashboard");
    revalidateTag("mapa");
    revalidateTag("analisis");
    revalidateTag("reportes");
    revalidatePath("/predios");
    revalidatePath(`/predios/${idPredio}`);
    return { ok: true, message: "Predio actualizado.", idPredio };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo actualizar el predio." };
  }
}

// -----------------------------------------------------------------------------
// Eliminar (hard delete — confirmar antes)
// -----------------------------------------------------------------------------
export async function eliminarPredioAction(formData: FormData): Promise<Result> {
  await requireRole(["ADMIN", "GESTOR"] as const);

  const parsed = safeParseForm(formData, {
    idPredio: { name: "idPredio", required: true, type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const idPredio = Number((parsed.data as Record<string, unknown>).idPredio);
  try {
    await eliminarPredio(idPredio);
    revalidateTag("predios");
    revalidateTag("dashboard");
    revalidateTag("mapa");
    revalidateTag("analisis");
    revalidateTag("reportes");
    revalidatePath("/predios");
    return { ok: true, message: "Predio eliminado." };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo eliminar el predio." };
  }
}
