// =============================================================================
// POST /api/analysis/spatial-select — Selecciona features dentro de un rectángulo
//
// Body:
//   { "minLng": -73.84, "minLat": 4.92, "maxLng": -73.82, "maxLat": 4.94 }
//
// Response:
//   { "bbox": {...}, "area_km2": 4.5, "results": { "predios": N, ... } }
//
// Sprint 18.4
// =============================================================================

import { NextResponse } from "next/server";
import { selectByBbox } from "@/lib/repos/spatial-select";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido (JSON requerido)" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body debe ser un objeto" }, { status: 400 });
  }
  const { minLng, minLat, maxLng, maxLat } = body as Record<string, unknown>;

  for (const [name, val] of Object.entries({ minLng, minLat, maxLng, maxLat })) {
    if (typeof val !== "number" || val < -180 || val > 180) {
      return NextResponse.json(
        { error: `${name} debe ser número entre -180 y 180` },
        { status: 400 },
      );
    }
  }

  try {
    const result = await selectByBbox(
      minLng as number,
      minLat as number,
      maxLng as number,
      maxLat as number,
    );
    return NextResponse.json(result);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("demasiado grande")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[api/analysis/spatial-select] error:", msg);
    return NextResponse.json({ error: "Error al seleccionar" }, { status: 500 });
  }
}
