// =============================================================================
// GET /api/geo/identify?lng=X&lat=Y&tol=50
//
// Encuentra features cercanas a un punto (lng, lat) en el mapa. Usado por
// la herramienta "Identificar" del MapTools.
//
// Query params:
//   - lng: longitud (requerido, -180 a 180)
//   - lat: latitud (requerido, -90 a 90)
//   - tol: tolerancia en metros (opcional, default 50, max 500)
//   - limit: máximo de features a devolver (opcional, default 10, max 50)
//
// Response: array de IdentifiedFeature ordenadas por distance_m asc.
//
// Sprint 18.2 — herramienta SIG "Identificar"
// =============================================================================

import { NextResponse } from "next/server";
import { findFeaturesAtPoint } from "@/lib/repos/identify";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lng = Number(searchParams.get("lng"));
  const lat = Number(searchParams.get("lat"));
  const tol = Number(searchParams.get("tol") ?? "50");
  const limit = Number(searchParams.get("limit") ?? "10");

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "lng inválido. Rango: [-180, 180]" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return NextResponse.json(
      { error: "lat inválido. Rango: [-90, 90]" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(tol) || tol < 1 || tol > 500) {
    return NextResponse.json(
      { error: "tol inválido. Rango: [1, 500] metros" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
    return NextResponse.json(
      { error: "limit inválido. Rango: [1, 50]" },
      { status: 400 },
    );
  }

  try {
    const features = await findFeaturesAtPoint(lng, lat, tol, limit);
    return NextResponse.json({
      query: { lng, lat, tol_m: tol },
      count: features.length,
      features,
    });
  } catch (err) {
    console.error("[api/geo/identify] error:", (err as Error).message);
    return NextResponse.json(
      { error: "Error al identificar features" },
      { status: 500 },
    );
  }
}
