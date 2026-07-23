// =============================================================================
// DEBT-3.8 — GET /api/geo?layer=X
//
// Devuelve GeoJSON FeatureCollection de una capa geografía. Las capas
// soportadas son:
//   - municipios     (polígonos)
//   - veredas        (polígonos)
//   - predios        (polígonos)
//   - biomas         (polígonos)
//   - drenajes       (líneas, quebradas simples)
//   - vias           (líneas)
//   - propuestas     (líneas, propuestas de aislamiento)
//
// DEBT-3.8 reemplaza el modelo anterior de markers. Ahora cada capa
// se pinta con L.geoJSON usando la geometría real (polígono o línea).
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import {
  getMunicipiosGeoJSON,
  getVeredasGeoJSON,
  getPrediosGeoJSON,
  getBiomasGeoJSON,
  getDrenajesSimplesGeoJSON,
  getViasGeoJSON,
  getPropuestasLineaGeoJSON,
} from "@/lib/repos/geojson";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LAYERS = {
  municipios:  getMunicipiosGeoJSON,
  veredas:     getVeredasGeoJSON,
  predios:     getPrediosGeoJSON,
  biomas:      getBiomasGeoJSON,
  drenajes:    getDrenajesSimplesGeoJSON,
  vias:        getViasGeoJSON,
  propuestas:  getPropuestasLineaGeoJSON,
} as const;

type LayerKey = keyof typeof LAYERS;

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const layer = new URL(req.url).searchParams.get("layer") as LayerKey | null;
  if (!layer || !(layer in LAYERS)) {
    return NextResponse.json(
      { error: `Layer inválido. Permitidos: ${Object.keys(LAYERS).join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const data = await LAYERS[layer]();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Error desconocido" },
      { status: 503 },
    );
  }
}
