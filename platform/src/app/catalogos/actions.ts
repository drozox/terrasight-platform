"use server";

// =============================================================================
// Server Actions para /catalogos (HU-TC-03)
//
// Solo ADMIN puede escribir. Los catalogos son configuracion dura del modelo
// BDG: un error aqui corrompe el resto del sistema.
//
// Validacion:
//   - safeParseForm para tipo/longitud/required.
//   - Whitelist adicional contra COMPONENTES_VALIDOS / ACCIONES_VALIDAS (la
//     BD ya tiene CHECK constraints, pero la doble red da mensajes utiles).
// =============================================================================

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { safeParseForm } from "@/lib/validation";
import {
  COMPONENTES_VALIDOS,
  ACCIONES_VALIDAS,
  type ComponenteValido,
  type AccionValida,
  crearComponente,
  actualizarComponente,
  eliminarComponente,
  crearAccion,
  actualizarAccion,
  eliminarAccion,
} from "@/lib/repository";

type Result =
  | { ok: true; message: string; idComponente?: number; idAccion?: number }
  | { ok: false; message: string; field?: string };

// -----------------------------------------------------------------------------
// Componente — Crear
// -----------------------------------------------------------------------------
export async function crearComponenteAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    nombre: {
      name: "nombre",
      required: true,
      type: "enum",
      values: COMPONENTES_VALIDOS as readonly string[],
    },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const nombre = (parsed.data as { nombre: string }).nombre as ComponenteValido;
  try {
    const fresh = await crearComponente(nombre);
    revalidatePath("/catalogos");
    return {
      ok: true,
      message: `Componente ${fresh.nombre} registrado.`,
      idComponente: fresh.idComponente,
    };
  } catch (err) {
    return {
      ok: false,
      message: (err as Error).message ?? "No se pudo crear el componente.",
    };
  }
}

// -----------------------------------------------------------------------------
// Componente — Actualizar
// -----------------------------------------------------------------------------
export async function actualizarComponenteAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idComponente: { name: "idComponente", required: true, type: "number", integer: true, min: 1 },
    nombre: {
      name: "nombre",
      required: true,
      type: "enum",
      values: COMPONENTES_VALIDOS as readonly string[],
    },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as { idComponente: number; nombre: string };
  try {
    await actualizarComponente(data.idComponente, data.nombre as ComponenteValido);
    revalidatePath("/catalogos");
    return {
      ok: true,
      message: `Componente renombrado a ${data.nombre}.`,
      idComponente: data.idComponente,
    };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    // 23505: unique_violation (otra fila ya tiene ese nombre)
    if (/unique|23505/i.test(msg)) {
      return {
        ok: false,
        message: `Ya existe otro componente con el nombre "${data.nombre}".`,
        field: "nombre",
      };
    }
    return { ok: false, message: msg || "No se pudo actualizar el componente." };
  }
}

// -----------------------------------------------------------------------------
// Componente — Eliminar
// -----------------------------------------------------------------------------
export async function eliminarComponenteAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idComponente: { name: "idComponente", required: true, type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const idComponente = (parsed.data as { idComponente: number }).idComponente;
  try {
    await eliminarComponente(idComponente);
    revalidatePath("/catalogos");
    return { ok: true, message: "Componente eliminado." };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/foreign key|23503/i.test(msg)) {
      return { ok: false, message: "El componente tiene dependencias; no se puede eliminar." };
    }
    return { ok: false, message: msg || "No se pudo eliminar el componente." };
  }
}

// -----------------------------------------------------------------------------
// Accion — Crear
// -----------------------------------------------------------------------------
export async function crearAccionAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    nombre: {
      name: "nombre",
      required: true,
      type: "enum",
      values: ACCIONES_VALIDAS as readonly string[],
    },
    idComponente: { name: "idComponente", required: true, type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as { nombre: string; idComponente: number };
  try {
    const fresh = await crearAccion(data.nombre as AccionValida, data.idComponente);
    revalidatePath("/catalogos");
    return {
      ok: true,
      message: `Accion ${fresh.nombre} del componente ${fresh.nombreComponente} registrada.`,
      idAccion: fresh.idAccion,
    };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/foreign key|23503/i.test(msg)) {
      return {
        ok: false,
        message: "El componente indicado no existe.",
        field: "idComponente",
      };
    }
    return { ok: false, message: msg || "No se pudo crear la accion." };
  }
}

// -----------------------------------------------------------------------------
// Accion — Actualizar
// -----------------------------------------------------------------------------
export async function actualizarAccionAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idAccion:     { name: "idAccion",     required: true, type: "number", integer: true, min: 1 },
    nombre:       {
      name: "nombre",
      required: true,
      type: "enum",
      values: ACCIONES_VALIDAS as readonly string[],
    },
    idComponente: { name: "idComponente", required: true, type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as { idAccion: number; nombre: string; idComponente: number };
  try {
    await actualizarAccion(data.idAccion, data.nombre as AccionValida, data.idComponente);
    revalidatePath("/catalogos");
    return {
      ok: true,
      message: "Accion actualizada.",
      idAccion: data.idAccion,
    };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/unique|23505/i.test(msg)) {
      return {
        ok: false,
        message: "Ya existe otra accion con ese nombre en el componente indicado.",
        field: "nombre",
      };
    }
    if (/foreign key|23503/i.test(msg)) {
      return {
        ok: false,
        message: "El componente indicado no existe.",
        field: "idComponente",
      };
    }
    return { ok: false, message: msg || "No se pudo actualizar la accion." };
  }
}

// -----------------------------------------------------------------------------
// Accion — Eliminar
// -----------------------------------------------------------------------------
export async function eliminarAccionAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idAccion: { name: "idAccion", required: true, type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const idAccion = (parsed.data as { idAccion: number }).idAccion;
  try {
    await eliminarAccion(idAccion);
    revalidatePath("/catalogos");
    return { ok: true, message: "Accion eliminada." };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/foreign key|23503/i.test(msg)) {
      return { ok: false, message: "La accion tiene propuestas asociadas; no se puede eliminar." };
    }
    return { ok: false, message: msg || "No se pudo eliminar la accion." };
  }
}