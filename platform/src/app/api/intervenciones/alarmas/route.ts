// =============================================================================
// /api/intervenciones/alarmas — POST/PATCH (DEEPSEEK-F2.3)
//
// POST   crea una alarma nueva para una intervención
// PATCH  marca una alarma como resuelta
// Valida ADMIN o GESTOR.
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import {
  crearAlarma,
  resolverAlarma,
  type AlarmaPropuesta,
} from "@/lib/repos/propuestas";

export const dynamic = "force-dynamic";

const TIPOS_VALIDOS: AlarmaPropuesta["tipo"][] = [
  "firma_pendiente",
  "no_autorizada_comunidad",
  "problema_tecnico",
  "requiere_visita",
  "otro",
];

export async function POST(req: Request) {
  const usuario = await getCurrentUser();
  if (!usuario || (usuario.rol !== "ADMIN" && usuario.rol !== "GESTOR")) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const idPropuesta = Number(form.get("idPropuesta"));
  const tipo = String(form.get("tipo") ?? "");
  const descripcion = String(form.get("descripcion") ?? "").trim();
  if (!Number.isFinite(idPropuesta) || idPropuesta <= 0) {
    return NextResponse.json({ ok: false, error: "idPropuesta inválido" }, { status: 400 });
  }
  if (!TIPOS_VALIDOS.includes(tipo as AlarmaPropuesta["tipo"])) {
    return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
  }
  if (!descripcion) {
    return NextResponse.json({ ok: false, error: "Descripción requerida" }, { status: 400 });
  }
  try {
    const { idAlarma } = await crearAlarma({
      idPropuesta,
      tipo: tipo as AlarmaPropuesta["tipo"],
      descripcion,
      creadoPor: usuario.idUsuario ?? null,
    });
    const alarma: AlarmaPropuesta = {
      idAlarma,
      idPropuesta,
      tipo: tipo as AlarmaPropuesta["tipo"],
      descripcion,
      creadoPor: usuario.idUsuario ?? null,
      creadoPorEmail: usuario.email,
      creadoEn: new Date(),
      resuelta: false,
      resueltaPor: null,
      resueltaPorEmail: null,
      resueltaEn: null,
      notaResolucion: "",
    };
    return NextResponse.json({ ok: true, alarma });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const usuario = await getCurrentUser();
  if (!usuario || (usuario.rol !== "ADMIN" && usuario.rol !== "GESTOR")) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const idAlarma = Number(form.get("idAlarma"));
  const notaResolucion = String(form.get("notaResolucion") ?? "").trim();
  if (!Number.isFinite(idAlarma) || idAlarma <= 0) {
    return NextResponse.json({ ok: false, error: "idAlarma inválido" }, { status: 400 });
  }
  try {
    await resolverAlarma({
      idAlarma,
      notaResolucion,
      resueltaPor: usuario.idUsuario ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
