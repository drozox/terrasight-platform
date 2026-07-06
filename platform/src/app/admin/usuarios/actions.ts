"use server";

// =============================================================================
// Server Actions para /admin/usuarios (HU-AD-02)
//
// Cada acción:
//   1. Llama a requireAdmin() — redirige si no sos ADMIN.
//   2. Valida input (no confiamos en el form).
//   3. Ejecuta SQL vía repository.
//   4. Devuelve {ok, message} tipado.
// =============================================================================

import { revalidatePath } from "next/cache";
import { safeParseForm } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth-guard";
import {
  crearUsuario,
  actualizarUsuario,
  resetPasswordUsuario,
  setUsuarioActivo,
} from "@/lib/repository";
import type { RolSistema } from "@/lib/auth";

type Result<TData = Record<string, unknown>> =
  | { ok: true; message: string; data?: TData }
  | { ok: false; message: string; field?: string };

const ROLES: RolSistema[] = ["ADMIN", "ANALISTA", "GESTOR"];

function isRol(s: string): s is RolSistema {
  return (ROLES as string[]).includes(s);
}

// -----------------------------------------------------------------------------
// Crear
// -----------------------------------------------------------------------------
export async function crearUsuarioAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    email:    { name: "email", required: true, type: "email" },
    nombre:   { name: "nombre", required: true, type: "string", min: 2, max: 120 },
    password: { name: "password", required: true, type: "string", min: 8, max: 200 },
    rol:      { name: "rol", required: true, type: "enum", values: ROLES },
  });

  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  try {
    const u = await crearUsuario({
      email:    parsed.data.email as string,
      nombre:   parsed.data.nombre as string,
      password: parsed.data.password as string,
      rol:      parsed.data.rol as RolSistema,
    });
    revalidatePath("/admin/usuarios");
    return { ok: true, message: `Usuario ${u.email} creado.`, data: { idUsuario: u.idUsuario } };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/duplicate key|unique constraint/i.test(msg)) {
      return { ok: false, message: "Ya existe un usuario con ese email.", field: "email" };
    }
    return { ok: false, message: msg || "No se pudo crear el usuario." };
  }
}

// -----------------------------------------------------------------------------
// Editar (nombre + rol + activo)
// -----------------------------------------------------------------------------
export async function actualizarUsuarioAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idUsuario: { name: "idUsuario", required: true, type: "number", integer: true, min: 1 },
    nombre:    { name: "nombre", required: true, type: "string", min: 2, max: 120 },
    rol:       { name: "rol", required: true, type: "enum", values: ROLES },
    activo:    { name: "activo", required: true, type: "boolean" },
  });

  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  try {
    await actualizarUsuario({
      idUsuario: parsed.data.idUsuario as number,
      nombre:    parsed.data.nombre as string,
      rol:       parsed.data.rol as RolSistema,
      activo:    parsed.data.activo as boolean,
    });
    revalidatePath("/admin/usuarios");
    return { ok: true, message: "Usuario actualizado." };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo actualizar." };
  }
}

// -----------------------------------------------------------------------------
// Reset de contraseña
// -----------------------------------------------------------------------------
export async function resetPasswordAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idUsuario: { name: "idUsuario", required: true, type: "number", integer: true, min: 1 },
    password:  { name: "password", required: true, type: "string", min: 8, max: 200 },
  });

  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  try {
    await resetPasswordUsuario({
      idUsuario: parsed.data.idUsuario as number,
      password:  parsed.data.password as string,
    });
    revalidatePath("/admin/usuarios");
    return { ok: true, message: "Contraseña actualizada." };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo resetear la contraseña." };
  }
}

// -----------------------------------------------------------------------------
// Toggle activo (separado del edit completo — flujo rápido de "desactivar cuenta")
// -----------------------------------------------------------------------------
export async function toggleActivoAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idUsuario: { name: "idUsuario", required: true, type: "number", integer: true, min: 1 },
    activo:    { name: "activo", required: true, type: "boolean" },
  });

  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  try {
    await setUsuarioActivo({
      idUsuario: parsed.data.idUsuario as number,
      activo:    parsed.data.activo as boolean,
    });
    revalidatePath("/admin/usuarios");
    return { ok: true, message: parsed.data.activo ? "Usuario activado." : "Usuario desactivado." };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo cambiar el estado." };
  }
}
