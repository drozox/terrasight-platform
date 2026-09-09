// =============================================================================
// GET /api/tiles/[layer]/[z]/[x]/[y]
//
// Devuelve un tile vectorial (MVT protobuf) para la capa + coordenada dada.
// Consumido por Leaflet.VectorGrid.Protobuf (cliente) o cualquier renderer MVT.
//
// URL pattern:
//   /api/tiles/drenajes/12/1538/2120  → tile z=12, x=1538, y=2120 de drenajes
//
// Headers de respuesta:
//   Content-Type: application/x-protobuf (o application/vnd.mapbox-vector-tile)
//   Cache-Control: public, max-age=3600 (1h) — los datos geográficos son estáticos
//
// Validación:
//   - layer ∈ whitelist {predios, vias, drenajes, propuestas, municipios, veredas}
//   - z ∈ [0, 22]
//   - x, y ∈ [0, 2^z - 1]
//
// Sprint 18.5 — UX-31 hotfix. Reemplaza carga de GeoJSON completo por MVT.
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { fetchMvtTile, isMvtLayer, type MvtLayer } from "@/lib/repos/mvt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ layer: string; z: string; x: string; y: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { layer, z, x, y } = await params;

  if (!isMvtLayer(layer)) {
    return NextResponse.json(
      { error: `Layer no soportado. Permitidos: drenajes, vias, predios, propuestas, municipios, veredas` },
      { status: 404 },
    );
  }

  const zNum = parseInt(z, 10);
  const xNum = parseInt(x, 10);
  const yNum = parseInt(y, 10);
  if (
    !Number.isInteger(zNum) ||
    !Number.isInteger(xNum) ||
    !Number.isInteger(yNum) ||
    zNum < 0 ||
    zNum > 22
  ) {
    return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
  }
  // x e y deben estar en [0, 2^z - 1]
  const maxCoord = (1 << zNum) - 1;
  if (xNum < 0 || xNum > maxCoord || yNum < 0 || yNum > maxCoord) {
    return NextResponse.json(
      { error: `Coordenadas fuera de rango para z=${zNum} (max ${maxCoord})` },
      { status: 400 },
    );
  }

  try {
    const buf = await fetchMvtTile(layer as MvtLayer, zNum, xNum, yNum);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.mapbox-vector-tile",
        "Content-Encoding": "identity",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[api/tiles] error:", (err as Error).message);
    return NextResponse.json({ error: "Error al generar tile" }, { status: 503 });
  }
}
