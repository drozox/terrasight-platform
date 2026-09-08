// =============================================================================
// POST /api/analysis/buffer — Genera un buffer y cuenta features intersectadas
//
// Body:
//   { "geometry": { "type": "Point", "coordinates": [lng, lat] },
//     "distance": 100, "units": "meters" }
//
// geometry puede ser Point, LineString o Polygon (GeoJSON).
// distance: metros (1 a 50000).
//
// Response:
//   { "buffer": <GeoJSON Polygon>,
//     "buffer_area_ha": 3.14,
//     "results": { "predios": N, "propuestas": N, ... } }
//
// Sprint 18.3 — herramienta Buffer
// =============================================================================

import { NextResponse } from "next/server";
import { analyzeBuffer, type BufferGeometry } from "@/lib/repos/buffer";

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
  const { geometry, distance } = body as { geometry?: unknown; distance?: unknown };

  if (!geometry || typeof geometry !== "object") {
    return NextResponse.json(
      { error: "geometry requerido (GeoJSON Point/LineString/Polygon)" },
      { status: 400 },
    );
  }
  if (typeof distance !== "number" || distance < 1 || distance > 50_000) {
    return NextResponse.json(
      { error: "distance debe ser un número entre 1 y 50000 metros" },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeBuffer(geometry as BufferGeometry, distance);
    return NextResponse.json({
      query: { geometry: (geometry as { type: string }).type, distance_m: distance },
      ...result,
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("inválida") || msg.includes("Distancia")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[api/analysis/buffer] error:", msg);
    return NextResponse.json({ error: "Error al generar buffer" }, { status: 500 });
  }
}
