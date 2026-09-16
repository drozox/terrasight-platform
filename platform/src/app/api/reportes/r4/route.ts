// =============================================================================
// GET /api/reportes/r4?predio=<id>
//
// Intervenciones (propuestas) de un predio, para la subpestaña
// "Ver intervenciones" del reporte R4.
// =============================================================================

import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { getIntervencionesDePredio } from "@/lib/repos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.rol !== "ADMIN" && user.rol !== "ANALISTA") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const predio = Number(req.nextUrl.searchParams.get("predio"));
  if (!Number.isFinite(predio) || predio <= 0) {
    return NextResponse.json({ error: "predio inválido" }, { status: 400 });
  }

  try {
    const intervenciones = await getIntervencionesDePredio(predio);
    return NextResponse.json({ ok: true, intervenciones });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Error consultando intervenciones" },
      { status: 503 },
    );
  }
}
