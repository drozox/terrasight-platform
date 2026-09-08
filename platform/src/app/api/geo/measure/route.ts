// =============================================================================
// POST /api/geo/measure — Ground truth de medición con PostGIS
//
// Recibe un array de puntos [lng, lat] y mide:
//   - Distancia total de la polilínea (ST_Length sobre LINESTRING)
//   - Área del polígono (ST_Area sobre POLYGON, si ≥3 puntos)
//
// Usa ST_GeomFromText con SRID 4686 y `::geography` cast para que las
// mediciones se hagan en metros sobre el elipsoide (no en grados).
//
// Body:
//   { "points": [[lng, lat], ...], "kind": "distance" | "area" }
//
// Response:
//   { "length_m": 1234.56, "area_m2": 12345.67 }  (los 2 campos se devuelven siempre)
//
// Sprint 18.1 — Medir distancia + área
// =============================================================================

import { NextResponse } from "next/server";
import { sql, pgNum } from "@/lib/db";

export const dynamic = "force-dynamic";

type Point = [number, number]; // [lng, lat]

function isValidPoint(p: unknown): p is Point {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    typeof p[0] === "number" &&
    typeof p[1] === "number" &&
    p[0] >= -180 &&
    p[0] <= 180 &&
    p[1] >= -90 &&
    p[1] <= 90
  );
}

function wktLineString(points: Point[]): string {
  return `LINESTRING(${points.map(([lng, lat]) => `${lng} ${lat}`).join(", ")})`;
}

function wktPolygon(points: Point[]): string {
  if (points.length < 3) return "";
  // Cerrar el polígono explícitamente
  const closed =
    points[0][0] === points[points.length - 1][0] &&
    points[0][1] === points[points.length - 1][1]
      ? points
      : [...points, points[0]];
  return `POLYGON((${closed.map(([lng, lat]) => `${lng} ${lat}`).join(", ")}))`;
}

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

  const { points, kind } = body as { points?: unknown; kind?: unknown };

  if (!Array.isArray(points) || points.length < 2) {
    return NextResponse.json(
      { error: "Se requieren al menos 2 puntos" },
      { status: 400 },
    );
  }
  if (!points.every(isValidPoint)) {
    return NextResponse.json(
      { error: "Puntos inválidos. Formato: [[lng, lat], ...] con rangos [-180,180] y [-90,90]" },
      { status: 400 },
    );
  }
  if (kind !== "distance" && kind !== "area") {
    return NextResponse.json(
      { error: "kind debe ser 'distance' o 'area'" },
      { status: 400 },
    );
  }

  const pts = points as Point[];

  try {
    // Para "distance" → ST_Length sobre LINESTRING
    // Para "area" → ST_Length (perímetro) + ST_Area sobre POLYGON
    // Siempre devolvemos ambos campos; el cliente decide cuál usar.
    const lineWkt = wktLineString(pts);
    const polyWkt = wktPolygon(pts);

    if (kind === "distance") {
      const rows = await sql<{ length_m: number | string }[]>`
        SELECT round(
          ST_Length(ST_GeomFromText(${lineWkt}, 4686)::geography)::numeric,
          3
        ) AS length_m
      `;
      return NextResponse.json({
        kind: "distance",
        length_m: pgNum(rows[0]?.length_m),
        area_m2: 0,
        points: pts.length,
      });
    }

    // kind === "area"
    if (polyWkt === "") {
      return NextResponse.json({
        kind: "area",
        length_m: 0,
        area_m2: 0,
        points: pts.length,
        warning: "Se requieren al menos 3 puntos para área",
      });
    }
    const rows = await sql<{ length_m: number | string; area_m2: number | string }[]>`
      SELECT
        round(ST_Length(ST_GeomFromText(${lineWkt}, 4686)::geography)::numeric, 3) AS length_m,
        round(ST_Area(ST_GeomFromText(${polyWkt}, 4686)::geography)::numeric, 3) AS area_m2
    `;
    return NextResponse.json({
      kind: "area",
      length_m: pgNum(rows[0]?.length_m),
      area_m2: pgNum(rows[0]?.area_m2),
      points: pts.length,
    });
  } catch (err) {
    console.error("[api/geo/measure] error:", (err as Error).message);
    return NextResponse.json(
      { error: "Error al calcular medición" },
      { status: 500 },
    );
  }
}
