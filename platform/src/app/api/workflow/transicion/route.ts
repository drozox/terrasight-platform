// =============================================================================
// POST /api/workflow/transicion — Aplica una transición de estado a una propuesta
//
// Body:
//   {
//     "id_propuesta": 123,
//     "from": "BORRADOR",
//     "to": "EN_REVISION",
//     "comentario": "Listo para revisión"  // opcional, requerido si la transición lo pide
//   }
//
// Validaciones:
//   - Usuario autenticado
//   - from/to son estados válidos
//   - El rol del usuario puede hacer la transición (verificable en workflow.ts)
//   - comentario es obligatorio si la transición lo requiere (e.g. RECHAZADA)
//
// Sprint 20 — workflow de intervenciones con máquina de estados
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { aplicarTransicion, ESTADOS, type EstadoPropuesta } from "@/lib/repos/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ESTADOS_SET = new Set<string>(ESTADOS);

function isEstado(s: unknown): s is EstadoPropuesta {
  return typeof s === "string" && ESTADOS_SET.has(s);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido (JSON requerido)" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body debe ser un objeto" }, { status: 400 });
  }
  const { id_propuesta, from, to, comentario } = body as Record<string, unknown>;

  if (typeof id_propuesta !== "number" || id_propuesta < 1) {
    return NextResponse.json({ error: "id_propuesta requerido (number > 0)" }, { status: 400 });
  }
  if (!isEstado(from)) {
    return NextResponse.json({ error: "from debe ser un estado válido" }, { status: 400 });
  }
  if (!isEstado(to)) {
    return NextResponse.json({ error: "to debe ser un estado válido" }, { status: 400 });
  }
  if (typeof comentario !== "string" && comentario !== undefined) {
    return NextResponse.json({ error: "comentario debe ser string" }, { status: 400 });
  }

  try {
    const result = await aplicarTransicion({
      idPropuesta: id_propuesta,
      from,
      to,
      rol: user.rol,
      usuario: user.email,
      comentario: comentario as string | undefined,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/workflow/transicion] error:", (err as Error).message);
    return NextResponse.json({ error: "Error al aplicar transición" }, { status: 503 });
  }
}
