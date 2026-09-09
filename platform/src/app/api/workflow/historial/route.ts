// =============================================================================
// GET /api/workflow/historial?id_propuesta=123 — Devuelve el historial de transiciones
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { getHistorial } from "@/lib/repos/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const idStr = new URL(request.url).searchParams.get("id_propuesta");
  const id = parseInt(idStr ?? "", 10);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "id_propuesta requerido (int > 0)" }, { status: 400 });
  }
  try {
    const historial = await getHistorial(id);
    return NextResponse.json({ historial });
  } catch (err) {
    console.error("[api/workflow/historial] error:", (err as Error).message);
    return NextResponse.json({ error: "Error al cargar historial" }, { status: 503 });
  }
}
