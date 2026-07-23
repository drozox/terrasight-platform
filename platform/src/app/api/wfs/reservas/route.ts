// =============================================================================
// DEBT-3.7 — Proxy WFS para Reservas Forestales y áreas protegidas (Cundinamarca).
// Misma lógica que /api/wfs/parques pero enfocado en reservas (protect_class 1).
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OVERPASS_QUERY = `[out:json][timeout:30];
(
  relation["boundary"="protected_area"]["protect_class"~"1|2"](3.5,-75.5,6.5,-72.5);
);
out geom;`;

const FALLBACK_RESERVAS: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { nombre: "RF Protectora Río Blanco", tipo: "Reserva Forestal" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-74.18, 4.65], [-73.85, 4.65], [-73.85, 5.05], [-74.18, 5.05], [-74.18, 4.65]
        ]],
      },
    },
    {
      type: "Feature",
      properties: { nombre: "RF Cuenca Alta del Río Bogotá", tipo: "Reserva Forestal" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-74.15, 4.35], [-73.65, 4.35], [-73.65, 4.85], [-74.15, 4.85], [-74.15, 4.35]
        ]],
      },
    },
  ],
};

interface OverpassElement {
  type: "way";
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function overpassToGeoJSON(data: OverpassResponse): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const el of data.elements) {
    if (el.type === "way" && el.geometry && el.geometry.length > 0) {
      const coords = el.geometry.map((p) => [p.lon, p.lat]);
      coords.push(coords[0]);
      features.push({
        type: "Feature",
        properties: {
          nombre: el.tags?.name || el.tags?.["name:es"] || `Área protegida ${el.id}`,
          tipo: "Reserva Forestal",
          source: "OpenStreetMap",
        },
        geometry: { type: "Polygon", coordinates: [coords] },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

async function fetchOverpass(): Promise<GeoJSON.FeatureCollection | null> {
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
      signal: AbortSignal.timeout(35_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OverpassResponse;
    const fc = overpassToGeoJSON(data);
    if (fc.features.length === 0) return null;
    return fc;
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const remote = await fetchOverpass();
  if (remote) {
    return NextResponse.json(remote, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }
  return NextResponse.json(FALLBACK_RESERVAS, {
    headers: { "Cache-Control": "public, max-age=300", "X-Source": "fallback" },
  });
}
