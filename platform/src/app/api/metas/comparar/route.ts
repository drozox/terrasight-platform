// =============================================================================
// POST /api/metas/comparar — compara dos snapshots y devuelve los deltas
// Body: { id_snapshot_a, id_snapshot_b }
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { compararSnapshots } from "@/lib/repos/versionado";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const { id_snapshot_a, id_snapshot_b } = body as { id_snapshot_a?: number; id_snapshot_b?: number };
  if (typeof id_snapshot_a !== "number" || typeof id_snapshot_b !== "number") {
    return NextResponse.json({ error: "id_snapshot_a y id_snapshot_b requeridos (number)" }, { status: 400 });
  }
  if (id_snapshot_a === id_snapshot_b) {
    return NextResponse.json({ error: "Los snapshots deben ser distintos" }, { status: 400 });
  }
  try {
    const comparacion = await compararSnapshots(id_snapshot_a, id_snapshot_b, user.email);
    if (!comparacion) {
      return NextResponse.json({ error: "Snapshot no encontrado" }, { status: 404 });
    }
    return NextResponse.json(comparacion);
  } catch (err) {
    console.error("[api/metas/comparar] error:", (err as Error).message);
    return NextResponse.json({ error: "Error al comparar" }, { status: 503 });
  }
}
