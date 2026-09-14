// =============================================================================
// /api/intervenciones/nueva — POST (DEEPSEEK-F2.2)
//
// Crea una propuesta/intervención nueva en sgs_pro_propuesta. El shape
// específico (punto/línea/polígono) se asocia después en la ficha.
//
// Valida que el usuario tenga rol ADMIN o GESTOR.
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { crearPropuesta } from "@/lib/repos/propuestas";

export const dynamic = "force-dynamic";

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

  const tipo = String(form.get("tipo") ?? "");
  const idAccionRaw = String(form.get("idAccion") ?? "");
  const idPredioRaw = String(form.get("idPredio") ?? "");
  const actividad = String(form.get("actividad") ?? "").trim();
  const observaciones = String(form.get("observaciones") ?? "").trim();

  if (tipo !== "punto" && tipo !== "linea" && tipo !== "poligono") {
    return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
  }
  const idAccion = Number(idAccionRaw);
  if (!Number.isFinite(idAccion) || idAccion <= 0) {
    return NextResponse.json({ ok: false, error: "Acción inválida" }, { status: 400 });
  }
  if (!actividad) {
    return NextResponse.json({ ok: false, error: "Actividad requerida" }, { status: 400 });
  }
  const idPredioNum = idPredioRaw ? Number(idPredioRaw) : null;
  const idPredio = idPredioNum !== null && Number.isFinite(idPredioNum) && idPredioNum > 0 ? idPredioNum : null;

  try {
    const { idPropuesta } = await crearPropuesta({
      tipo,
      idAccion,
      idPredio,
      actividad,
      observaciones: observaciones || undefined,
    });
    return NextResponse.json({ ok: true, id: idPropuesta });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
