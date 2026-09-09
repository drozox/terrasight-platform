// =============================================================================
// GET  /api/metas/snapshots            — lista snapshots
// POST /api/metas/snapshots            — crea snapshot del estado actual
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { listarSnapshots, crearSnapshotMetas } from "@/lib/repos/versionado";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const snapshots = await listarSnapshots(30);
  return NextResponse.json({ snapshots });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.rol !== "ADMIN" && user.rol !== "ANALISTA") {
    return NextResponse.json({ error: "Solo ADMIN/ANALISTA pueden crear snapshots" }, { status: 403 });
  }
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // body vacío OK
  }
  const fechaCorte = (body as { fecha_corte?: string }).fecha_corte ?? new Date().toISOString().slice(0, 10);
  const descripcion = (body as { descripcion?: string }).descripcion;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaCorte)) {
    return NextResponse.json({ error: "fecha_corte debe ser YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const result = await crearSnapshotMetas({
      fechaCorte,
      descripcion,
      usuario: user.email,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/metas/snapshots] error:", (err as Error).message);
    return NextResponse.json({ error: "Error al crear snapshot" }, { status: 503 });
  }
}
