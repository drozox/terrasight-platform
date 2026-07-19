"use server";

// =============================================================================
// Server Actions para /catalogos (HU-TC-03 y HU-TC-06..10)
//
// Solo ADMIN puede escribir. Los catalogos son configuracion dura del modelo
// BDG: un error aqui corrompe el resto del sistema.
//
// Validacion:
//   - safeParseForm para tipo/longitud/required.
//   - Whitelist adicional contra COMPONENTES_VALIDOS / ACCIONES_VALIDAS (la
//     BD ya tiene CHECK constraints, pero la doble red da mensajes utiles).
//   - Para catalogos secundarios: validacion de FK en updates y pre-check de
//     dependencias en deletes via el repository.
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
  // Catalogos secundarios (HU-TC-06..10)
  crearMunicipio,
  actualizarMunicipio,
  eliminarMunicipio,
  crearVereda,
  actualizarVereda,
  eliminarVereda,
  crearPropietario,
  actualizarPropietario,
  eliminarPropietario,
  crearMicrocuenca,
  actualizarMicrocuenca,
  eliminarMicrocuenca,
  crearBeneficiario,
  actualizarBeneficiario,
  eliminarBeneficiario,
} from "@/lib/repository";

type Result =
  | { ok: true; message: string; id?: number; idComponente?: number; idAccion?: number }
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


// =============================================================================
// Catalogos secundarios (HU-TC-06..10)
//
// Mismo patron que Componente/Accion: requireAdmin + safeParseForm +
// try/catch 23505/23503. Las validaciones de longitud/required son
// declarativas; el repository hace la validacion regex (telefono) y
// pre-check de dependencias en eliminar (mensaje claro al usuario).
// =============================================================================


// -----------------------------------------------------------------------------
// HU-TC-06: Municipio
// -----------------------------------------------------------------------------
export async function crearMunicipioAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    nombreMunicipio:      { name: "nombreMunicipio",      required: true, type: "string", min: 2, max: 255 },
    codigoAdministrativo: { name: "codigoAdministrativo", required: true, type: "string", min: 1, max: 50 },
    departamento:         { name: "departamento",         required: true, type: "string", min: 2, max: 100 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as { nombreMunicipio: string; codigoAdministrativo: string; departamento: string };
  try {
    const fresh = await crearMunicipio(data);
    revalidatePath("/catalogos");
    return { ok: true, message: `Municipio ${fresh.nombreMunicipio} registrado.`, id: fresh.idMunicipio };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo crear el municipio." };
  }
}

export async function actualizarMunicipioAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idMunicipio:          { name: "idMunicipio",          required: true, type: "number", integer: true, min: 1 },
    nombreMunicipio:      { name: "nombreMunicipio",      required: true, type: "string", min: 2, max: 255 },
    codigoAdministrativo: { name: "codigoAdministrativo", required: true, type: "string", min: 1, max: 50 },
    departamento:         { name: "departamento",         required: true, type: "string", min: 2, max: 100 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as {
    idMunicipio: number; nombreMunicipio: string; codigoAdministrativo: string; departamento: string;
  };
  try {
    await actualizarMunicipio(data.idMunicipio, {
      nombreMunicipio: data.nombreMunicipio,
      codigoAdministrativo: data.codigoAdministrativo,
      departamento: data.departamento,
    });
    revalidatePath("/catalogos");
    return { ok: true, message: `Municipio actualizado.`, id: data.idMunicipio };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/unique|23505/i.test(msg)) {
      return { ok: false, message: `Ya existe otro municipio con ese nombre en el departamento indicado.`, field: "nombreMunicipio" };
    }
    if (/foreign key|23503/i.test(msg)) {
      return { ok: false, message: "El municipio no se puede actualizar porque tiene dependencias." };
    }
    return { ok: false, message: msg || "No se pudo actualizar el municipio." };
  }
}

export async function eliminarMunicipioAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idMunicipio: { name: "idMunicipio", required: true, type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const idMunicipio = (parsed.data as { idMunicipio: number }).idMunicipio;
  try {
    await eliminarMunicipio(idMunicipio);
    revalidatePath("/catalogos");
    return { ok: true, message: "Municipio eliminado." };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo eliminar el municipio." };
  }
}


// -----------------------------------------------------------------------------
// HU-TC-07: Vereda
// -----------------------------------------------------------------------------
export async function crearVeredaAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    nombreVereda:         { name: "nombreVereda",         required: true,  type: "string", min: 2, max: 255 },
    codigoAdministrativo: { name: "codigoAdministrativo", required: true,  type: "string", min: 1, max: 50 },
    poblacionEstimada:    { name: "poblacionEstimada",    required: false, type: "number", integer: true, min: 0 },
    idMunicipio:          { name: "idMunicipio",          required: true,  type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as {
    nombreVereda: string; codigoAdministrativo: string;
    poblacionEstimada?: number; idMunicipio: number;
  };
  try {
    const fresh = await crearVereda({
      nombreVereda: data.nombreVereda,
      codigoAdministrativo: data.codigoAdministrativo,
      poblacionEstimada: data.poblacionEstimada,
      idMunicipio: data.idMunicipio,
    });
    revalidatePath("/catalogos");
    return { ok: true, message: `Vereda ${fresh.nombreVereda} registrada.`, id: fresh.idVereda };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/unique|23505/i.test(msg)) {
      return { ok: false, message: "Ya existe otra vereda con ese nombre en el municipio indicado.", field: "nombreVereda" };
    }
    if (/foreign key|23503/i.test(msg)) {
      return { ok: false, message: "El municipio indicado no existe.", field: "idMunicipio" };
    }
    return { ok: false, message: msg || "No se pudo crear la vereda." };
  }
}

export async function actualizarVeredaAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idVereda:             { name: "idVereda",             required: true,  type: "number", integer: true, min: 1 },
    nombreVereda:         { name: "nombreVereda",         required: true,  type: "string", min: 2, max: 255 },
    codigoAdministrativo: { name: "codigoAdministrativo", required: true,  type: "string", min: 1, max: 50 },
    poblacionEstimada:    { name: "poblacionEstimada",    required: false, type: "number", integer: true, min: 0 },
    idMunicipio:          { name: "idMunicipio",          required: true,  type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as {
    idVereda: number; nombreVereda: string; codigoAdministrativo: string;
    poblacionEstimada?: number; idMunicipio: number;
  };
  try {
    await actualizarVereda(data.idVereda, {
      nombreVereda: data.nombreVereda,
      codigoAdministrativo: data.codigoAdministrativo,
      poblacionEstimada: data.poblacionEstimada,
      idMunicipio: data.idMunicipio,
    });
    revalidatePath("/catalogos");
    return { ok: true, message: "Vereda actualizada.", id: data.idVereda };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/unique|23505/i.test(msg)) {
      return { ok: false, message: "Ya existe otra vereda con ese nombre en el municipio indicado.", field: "nombreVereda" };
    }
    if (/foreign key|23503/i.test(msg)) {
      return { ok: false, message: "El municipio indicado no existe.", field: "idMunicipio" };
    }
    return { ok: false, message: msg || "No se pudo actualizar la vereda." };
  }
}

export async function eliminarVeredaAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idVereda: { name: "idVereda", required: true, type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const idVereda = (parsed.data as { idVereda: number }).idVereda;
  try {
    await eliminarVereda(idVereda);
    revalidatePath("/catalogos");
    return { ok: true, message: "Vereda eliminada." };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo eliminar la vereda." };
  }
}


// -----------------------------------------------------------------------------
// HU-TC-08: Propietario
// -----------------------------------------------------------------------------
export async function crearPropietarioAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    nombreRazonSocial: { name: "nombreRazonSocial", required: true,  type: "string", min: 2, max: 255 },
    telefono:          { name: "telefono",          required: false, type: "string", min: 7, max: 20 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as { nombreRazonSocial: string; telefono?: string };
  try {
    const fresh = await crearPropietario({
      nombreRazonSocial: data.nombreRazonSocial,
      telefono: data.telefono,
    });
    revalidatePath("/catalogos");
    return { ok: true, message: `Propietario ${fresh.nombreRazonSocial} registrado.`, id: fresh.idPropietario };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/unique|23505/i.test(msg)) {
      return { ok: false, message: "Ya existe otro propietario con ese nombre o razon social.", field: "nombreRazonSocial" };
    }
    return { ok: false, message: msg || "No se pudo crear el propietario." };
  }
}

export async function actualizarPropietarioAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idPropietario:      { name: "idPropietario",      required: true,  type: "number", integer: true, min: 1 },
    nombreRazonSocial:  { name: "nombreRazonSocial",  required: true,  type: "string", min: 2, max: 255 },
    telefono:           { name: "telefono",           required: false, type: "string", min: 7, max: 20 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as { idPropietario: number; nombreRazonSocial: string; telefono?: string };
  try {
    await actualizarPropietario(data.idPropietario, {
      nombreRazonSocial: data.nombreRazonSocial,
      telefono: data.telefono,
    });
    revalidatePath("/catalogos");
    return { ok: true, message: "Propietario actualizado.", id: data.idPropietario };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/unique|23505/i.test(msg)) {
      return { ok: false, message: "Ya existe otro propietario con ese nombre o razon social.", field: "nombreRazonSocial" };
    }
    return { ok: false, message: msg || "No se pudo actualizar el propietario." };
  }
}

export async function eliminarPropietarioAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idPropietario: { name: "idPropietario", required: true, type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const idPropietario = (parsed.data as { idPropietario: number }).idPropietario;
  try {
    await eliminarPropietario(idPropietario);
    revalidatePath("/catalogos");
    return { ok: true, message: "Propietario eliminado." };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo eliminar el propietario." };
  }
}


// -----------------------------------------------------------------------------
// HU-TC-09: Microcuenca
// -----------------------------------------------------------------------------
export async function crearMicrocuencaAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    nombreMicrocuenca: { name: "nombreMicrocuenca", required: true,  type: "string", min: 2, max: 255 },
    codigo:            { name: "codigo",            required: true,  type: "string", min: 1, max: 50 },
    area:              { name: "area",              required: false, type: "number", min: 0 },
    latitud:           { name: "latitud",           required: false, type: "number", min: -90, max: 90 },
    longitud:          { name: "longitud",          required: false, type: "number", min: -180, max: 180 },
    nombreUsuarios:    { name: "nombreUsuarios",    required: false, type: "string", max: 255 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as {
    nombreMicrocuenca: string; codigo: string;
    area?: number; latitud?: number; longitud?: number; nombreUsuarios?: string;
  };
  try {
    const fresh = await crearMicrocuenca(data);
    revalidatePath("/catalogos");
    return { ok: true, message: `Microcuenca ${fresh.nombreMicrocuenca} registrada.`, id: fresh.idMicrocuenca };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/unique|23505/i.test(msg)) {
      return { ok: false, message: "Ya existe otra microcuenca con ese codigo.", field: "codigo" };
    }
    return { ok: false, message: msg || "No se pudo crear la microcuenca." };
  }
}

export async function actualizarMicrocuencaAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idMicrocuenca:     { name: "idMicrocuenca",     required: true,  type: "number", integer: true, min: 1 },
    nombreMicrocuenca: { name: "nombreMicrocuenca", required: true,  type: "string", min: 2, max: 255 },
    codigo:            { name: "codigo",            required: true,  type: "string", min: 1, max: 50 },
    area:              { name: "area",              required: false, type: "number", min: 0 },
    latitud:           { name: "latitud",           required: false, type: "number", min: -90, max: 90 },
    longitud:          { name: "longitud",          required: false, type: "number", min: -180, max: 180 },
    nombreUsuarios:    { name: "nombreUsuarios",    required: false, type: "string", max: 255 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as {
    idMicrocuenca: number; nombreMicrocuenca: string; codigo: string;
    area?: number; latitud?: number; longitud?: number; nombreUsuarios?: string;
  };
  try {
    await actualizarMicrocuenca(data.idMicrocuenca, {
      nombreMicrocuenca: data.nombreMicrocuenca,
      codigo: data.codigo,
      area: data.area,
      latitud: data.latitud,
      longitud: data.longitud,
      nombreUsuarios: data.nombreUsuarios,
    });
    revalidatePath("/catalogos");
    return { ok: true, message: "Microcuenca actualizada.", id: data.idMicrocuenca };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/unique|23505/i.test(msg)) {
      return { ok: false, message: "Ya existe otra microcuenca con ese codigo.", field: "codigo" };
    }
    return { ok: false, message: msg || "No se pudo actualizar la microcuenca." };
  }
}

export async function eliminarMicrocuencaAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idMicrocuenca: { name: "idMicrocuenca", required: true, type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const idMicrocuenca = (parsed.data as { idMicrocuenca: number }).idMicrocuenca;
  try {
    await eliminarMicrocuenca(idMicrocuenca);
    revalidatePath("/catalogos");
    return { ok: true, message: "Microcuenca eliminada." };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo eliminar la microcuenca." };
  }
}


// -----------------------------------------------------------------------------
// HU-TC-10: Beneficiario (sgs_pre_usuario)
//
// Mismo flujo que en /monitoreo: se valida con la misma logica (telefono
// obligatorio, regex). El repository hace el UPSERT amable via ON CONFLICT
// (nombre, telefono). Si telefono viene vacio, devuelve error explicito.
// -----------------------------------------------------------------------------
export async function crearBeneficiarioCatalogosAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    nombre:    { name: "nombre",    required: true,  type: "string", min: 2, max: 200 },
    telefono:  { name: "telefono",  required: true,  type: "string", min: 7, max: 20 },
    vereda:    { name: "vereda",    required: false, type: "string", max: 200 },
    municipio: { name: "municipio", required: false, type: "string", max: 200 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as { nombre: string; telefono: string; vereda?: string; municipio?: string };
  try {
    const fresh = await crearBeneficiario(data);
    revalidatePath("/catalogos");
    return { ok: true, message: `Beneficiario ${fresh.nombre} registrado.`, id: fresh.idUsuario };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/unique|23505/i.test(msg)) {
      return { ok: false, message: "Ya existe otro beneficiario con ese nombre y telefono.", field: "nombre" };
    }
    return { ok: false, message: msg || "No se pudo crear el beneficiario." };
  }
}

export async function actualizarBeneficiarioAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idUsuario:  { name: "idUsuario",  required: true,  type: "number", integer: true, min: 1 },
    nombre:    { name: "nombre",    required: true,  type: "string", min: 2, max: 200 },
    telefono:  { name: "telefono",  required: true,  type: "string", min: 7, max: 20 },
    vereda:    { name: "vereda",    required: false, type: "string", max: 200 },
    municipio: { name: "municipio", required: false, type: "string", max: 200 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as {
    idUsuario: number; nombre: string; telefono: string; vereda?: string; municipio?: string;
  };
  try {
    await actualizarBeneficiario(data.idUsuario, {
      nombre: data.nombre,
      telefono: data.telefono,
      vereda: data.vereda,
      municipio: data.municipio,
    });
    revalidatePath("/catalogos");
    return { ok: true, message: "Beneficiario actualizado.", id: data.idUsuario };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo actualizar el beneficiario." };
  }
}

export async function eliminarBeneficiarioAction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const parsed = safeParseForm(formData, {
    idUsuario: { name: "idUsuario", required: true, type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const idUsuario = (parsed.data as { idUsuario: number }).idUsuario;
  try {
    await eliminarBeneficiario(idUsuario);
    revalidatePath("/catalogos");
    return { ok: true, message: "Beneficiario eliminado." };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo eliminar el beneficiario." };
  }
}
