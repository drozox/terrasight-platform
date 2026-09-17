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
import type { FeatureCollection } from "geojson";
import {
  getMunicipiosGeoJSON,
  getVeredasGeoJSON,
  getPrediosGeoJSON,
  getBiomasGeoJSON,
  getDrenajesSimplesGeoJSON,
  getDrenajesDoblesGeoJSON,
  getParamosGeoJSON,
  getViasGeoJSON,
  getPropuestasLineaGeoJSON,
  getPropuestasPuntoGeoJSON,
  getPropuestasPoligonoGeoJSON,
  getComponenteFootprintGeoJSON,
} from "@/lib/repos/geojson";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LAYERS = {
  municipios:         getMunicipiosGeoJSON,
  veredas:            getVeredasGeoJSON,
  predios:            getPrediosGeoJSON,
  biomas:             getBiomasGeoJSON,
  drenajes:           getDrenajesSimplesGeoJSON,
  drenajes_dobles:    getDrenajesDoblesGeoJSON,
  paramos:            getParamosGeoJSON,
  vias:               getViasGeoJSON,
  propuestas:         getPropuestasLineaGeoJSON,
  propuestas_punto:   getPropuestasPuntoGeoJSON,
  propuestas_poligono: getPropuestasPoligonoGeoJSON,
} as const;

type LayerKey = keyof typeof LAYERS;

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const layer = sp.get("layer");

  // Capa dinámica: huella de un componente (?layer=componente&componente=C1
  // [&accion=CxAy]). Devuelve punto + polígono + línea de las propuestas del
  // componente (o de la acción concreta si llega `accion`) para que el visor
  // haga fitBounds y lo resalte.
  if (layer === "componente") {
    const componente = sp.get("componente");
    const accionRaw = sp.get("accion");
    if (!componente) {
      return NextResponse.json(
        { error: "Falta el parámetro 'componente' (C1, C2 o C3)." },
        { status: 400 },
      );
    }
    // T1 filtro-accion: accion es opcional; si llega, validar contra el
    // catalogo canonico (C1A1..C3AU). Si no encaja, se ignora silenciosa-
    // mente para no romper el visor con URLs mal formadas.
    const accionValida: import("@/lib/acciones").AccionCode | null =
      accionRaw && /^(C1A1|C1A2|C2A1|C2A2|C3AU)$/i.test(accionRaw)
        ? (accionRaw.toUpperCase() as import("@/lib/acciones").AccionCode)
        : null;
    try {
      const data = await getComponenteFootprintGeoJSON(componente, accionValida);
      return NextResponse.json(data, {
        headers: { "Cache-Control": "public, max-age=120" },
      });
    } catch (err) {
      return NextResponse.json(
        { error: (err as Error).message ?? "Error desconocido" },
        { status: 503 },
      );
    }
  }

  if (!layer || !(layer in LAYERS)) {
    return NextResponse.json(
      { error: `Layer inválido. Permitidos: ${Object.keys(LAYERS).join(", ")}` },
      { status: 400 },
    );
  }

  try {
    // Capas que aceptan filtro por componente/acción (propuestas + base).
    const CON_FILTRO = new Set([
      "propuestas", "propuestas_punto", "propuestas_poligono",
      "municipios", "veredas", "drenajes", "drenajes_dobles", "vias", "predios",
    ]);
    let data: FeatureCollection;
    let filtered = false;
    if (CON_FILTRO.has(layer)) {
      const comp = sp.get("componente");
      const acc = sp.get("accion");
      filtered = !!(comp || acc);
      const fn = LAYERS[layer as LayerKey] as (c: string | null, a: string | null) => Promise<FeatureCollection>;
      data = await fn(comp, acc);
    } else {
      data = await LAYERS[layer as LayerKey]();
    }
    return NextResponse.json(data, {
      // Con filtro: nunca cachear (así el cambio de componente/acción siempre
      // refleja el subconjunto correcto). Sin filtro: cache corto.
      headers: {
        "Cache-Control": filtered ? "private, no-store" : "public, max-age=300",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Error desconocido" },
      { status: 503 },
    );
  }
}
