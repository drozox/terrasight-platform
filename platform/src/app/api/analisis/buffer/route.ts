// =============================================================================
// POST /api/analisis/buffer
//
// Recibe { tipo, id, distanciaM } y devuelve los resultados del buffer
// como JSON. Pensado para integraciones externas o clientes que prefieran
// fetch directo en vez de recargar la página.
//
// La página /analisis usa su propio flujo vía search params; este endpoint
// es independiente.
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { getAnalisisBuffer, isBufferTarget, type BufferTarget } from "@/lib/repository";

export const runtime = "nodejs";

interface Body {
  tipo: BufferTarget;
  id: number;
  distanciaM: number;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return bad("No autenticado", 401);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("JSON inválido");
  }

  if (!isBufferTarget(body.tipo)) return bad(`tipo inválido: ${body.tipo}`);
  if (!Number.isFinite(body.id) || body.id <= 0) return bad("id inválido");
  if (!Number.isFinite(body.distanciaM) || body.distanciaM <= 0 || body.distanciaM > 50000) {
    return bad("distanciaM debe estar entre 1 y 50000");
  }

  try {
    const items = await getAnalisisBuffer({
      target: body.tipo,
      id: body.id,
      distanciaM: body.distanciaM,
    });
    return NextResponse.json({
      ok: true,
      total: items.length,
      items,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? "Error desconocido" },
      { status: 503 },
    );
  }
}
