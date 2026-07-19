"use server";

// =============================================================================
// Server Actions para /monitoreo (HU-MO-01..03)
//
// Edicion de puntos de monitoreo (obra_captacion, estacion_limnimetrica,
// bebedero, tanque, panel_solar) y gestion de beneficiarios asociados.
//
// Role: ADMIN | GESTOR pueden escribir. ANALISTA es read-only.
//
// Validacion: safeParseForm con schema declarativo. Whitelists cruzadas con
// repository.ts (TIPOS_PUNTO) para doble red.
// =============================================================================

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { safeParseForm } from "@/lib/validation";
import {
  TIPOS_PUNTO,
  actualizarPunto,
  asociarBeneficiario,
  desasociarBeneficiario,
  crearBeneficiario,
  listBeneficiariosByPunto,
  listBeneficiariosDisponiblesByPunto,
  type BeneficiarioMini,
} from "@/lib/repository";

type Result =
  | { ok: true; message: string; id?: number }
  | { ok: false; message: string; field?: string };

/**
 * Carga combinada de beneficiarios asociados y disponibles para un punto.
 * Pensado para el editor cliente (HU-MO-03) que muestra las dos listas
 * lado a lado y permite mover usuarios entre una y otra.
 *
 * NO usa `revalidatePath` porque es solo lectura. Devuelve listas vacias
 * si el punto no existe o falla la query — el cliente verifica `error`
 * para mostrar feedback no-bloqueante.
 */
export type BeneficiariosPorPuntoResult =
  | { ok: true; actuales: BeneficiarioMini[]; disponibles: BeneficiarioMini[] }
  | { ok: false; error: string };

export async function getBeneficiariosByPuntoAction(
  idPropPunto: number,
): Promise<BeneficiariosPorPuntoResult> {
  // Read-only: permitimos a cualquier rol autenticado (incluye ANALISTA)
  // ya que la ficha se muestra al expandir.
  await requireRole(["ADMIN", "GESTOR", "ANALISTA"] as const);

  if (!Number.isInteger(idPropPunto) || idPropPunto < 1) {
    return { ok: false, error: "idPropPunto inválido." };
  }
  try {
    const [actuales, disponibles] = await Promise.all([
      listBeneficiariosByPunto(idPropPunto),
      listBeneficiariosDisponiblesByPunto(idPropPunto),
    ]);
    return { ok: true, actuales, disponibles };
  } catch (err) {
    return {
      ok: false,
      error: (err as Error).message ?? "No se pudieron cargar los beneficiarios.",
    };
  }
}

// -----------------------------------------------------------------------------
// Actualizar punto de monitoreo
// -----------------------------------------------------------------------------
export async function actualizarPuntoAction(formData: FormData): Promise<Result> {
  await requireRole(["ADMIN", "GESTOR"] as const);

  const parsed = safeParseForm(formData, {
    idPropPunto:        { name: "idPropPunto",        required: true,  type: "number",  integer: true, min: 1 },
    actividad:          { name: "actividad",          required: true,  type: "string",  min: 2, max: 255 },
    descripcion:        { name: "descripcion",        required: false, type: "string",  max: 2000 },
    tipoPunto:          { name: "tipoPunto",          required: true,  type: "enum",    values: TIPOS_PUNTO as readonly string[] },
    tipoObra:           { name: "tipoObra",           required: true,  type: "number",  integer: true, min: 1, max: 3 },
    estructuraAnclaje:  { name: "estructuraAnclaje",  required: false, type: "boolean" },
    nivelComplejidad:   { name: "nivelComplejidad",   required: false, type: "string",  max: 50 },
    idEstacionOriginal: { name: "idEstacionOriginal", required: false, type: "string",  max: 50 },
    codTipo:            { name: "codTipo",            required: false, type: "string",  max: 50 },
    codigoCaj:          { name: "codigoCaj",          required: false, type: "string",  max: 50 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as Record<string, unknown>;
  const idPropPunto = Number(data.idPropPunto);

  try {
    await actualizarPunto(idPropPunto, {
      actividad:          String(data.actividad),
      descripcion:        data.descripcion        == null ? ""  : String(data.descripcion),
      tipoPunto:          String(data.tipoPunto) as (typeof TIPOS_PUNTO)[number],
      tipoObra:           Number(data.tipoObra),
      estructuraAnclaje:  Boolean(data.estructuraAnclaje),
      nivelComplejidad:   data.nivelComplejidad   == null ? ""  : String(data.nivelComplejidad),
      idEstacionOriginal: data.idEstacionOriginal == null ? "" : String(data.idEstacionOriginal),
      codTipo:            data.codTipo            == null ? ""  : String(data.codTipo),
      codigoCaj:          data.codigoCaj          == null ? ""  : String(data.codigoCaj),
    });
    revalidatePath("/monitoreo");
    return { ok: true, message: "Punto de monitoreo actualizado.", id: idPropPunto };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    // 23514: CHECK violation (tipo_obra fuera de 1..3, tipo_punto fuera de whitelist)
    if (/check constraint|23514/i.test(msg)) {
      return { ok: false, message: "Datos inválidos: revisa tipo de obra y tipo de punto." };
    }
    return { ok: false, message: msg || "No se pudo actualizar el punto." };
  }
}

// -----------------------------------------------------------------------------
// Asociar beneficiario a un punto
// -----------------------------------------------------------------------------
export async function asociarBeneficiarioAction(formData: FormData): Promise<Result> {
  await requireRole(["ADMIN", "GESTOR"] as const);

  const parsed = safeParseForm(formData, {
    idPropPunto: { name: "idPropPunto", required: true, type: "number", integer: true, min: 1 },
    idUsuario:   { name: "idUsuario",   required: true, type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as { idPropPunto: number; idUsuario: number };
  try {
    await asociarBeneficiario(data.idPropPunto, data.idUsuario);
    revalidatePath("/monitoreo");
    return { ok: true, message: "Beneficiario asociado." };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/foreign key|23503/i.test(msg)) {
      return { ok: false, message: "Punto o usuario inexistente." };
    }
    return { ok: false, message: msg || "No se pudo asociar el beneficiario." };
  }
}

// -----------------------------------------------------------------------------
// Desasociar beneficiario de un punto
// -----------------------------------------------------------------------------
export async function desasociarBeneficiarioAction(formData: FormData): Promise<Result> {
  await requireRole(["ADMIN", "GESTOR"] as const);

  const parsed = safeParseForm(formData, {
    idPropPunto: { name: "idPropPunto", required: true, type: "number", integer: true, min: 1 },
    idUsuario:   { name: "idUsuario",   required: true, type: "number", integer: true, min: 1 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as { idPropPunto: number; idUsuario: number };
  try {
    await desasociarBeneficiario(data.idPropPunto, data.idUsuario);
    revalidatePath("/monitoreo");
    return { ok: true, message: "Beneficiario desasociado." };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo desasociar el beneficiario." };
  }
}

// -----------------------------------------------------------------------------
// Crear beneficiario (sgs_pre_usuario)
//
// HU-TC-10: ahora `crearBeneficiario` devuelve BeneficiarioFull (con
// createdAt/updatedAt y contador de relaciones). El idUsuario se mantiene
// compatible.
// -----------------------------------------------------------------------------
export async function crearBeneficiarioAction(formData: FormData): Promise<Result> {
  await requireRole(["ADMIN", "GESTOR"] as const);

  const parsed = safeParseForm(formData, {
    nombre:    { name: "nombre",    required: true,  type: "string", min: 2, max: 200 },
    telefono:  { name: "telefono",  required: true,  type: "string", min: 7, max: 20 },
    vereda:    { name: "vereda",    required: false, type: "string", max: 200 },
    municipio: { name: "municipio", required: false, type: "string", max: 200 },
  });
  if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };

  const data = parsed.data as Record<string, unknown>;
  try {
    const fresh = await crearBeneficiario({
      nombre:    String(data.nombre),
      telefono:  data.telefono  == null ? undefined : String(data.telefono),
      vereda:    data.vereda    == null ? undefined : String(data.vereda),
      municipio: data.municipio == null ? undefined : String(data.municipio),
    });
    revalidatePath("/monitoreo");
    return { ok: true, message: `Beneficiario ${fresh.nombre} creado.`, id: fresh.idUsuario };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo crear el beneficiario." };
  }
}
