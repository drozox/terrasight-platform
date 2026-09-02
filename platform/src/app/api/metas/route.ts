// =============================================================================
// GET /api/metas — Datos para la página /metas.
//
// Devuelve en una sola respuesta:
//   - metas:        MetaResumen[] (9 metas del convenio con current vs meta)
//   - global:       MetasGlobal   (totales para el hero)
//   - municipios:   MunicipioIntervenido[] (los que tienen al menos 1 propuesta)
//
// Auth: cualquier usuario logueado. No es admin-only porque las metas son
// un KPI transversal que se muestra a todos los roles.
//
// Caché: 60s en CDN. Las métricas cambian cuando se cargan propuestas,
// no en cada request, así que un cache corto es seguro.
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import {
  getMetasResumen,
  getMetasGlobal,
  getMunicipiosIntervenidos,
} from "@/lib/repos/metas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const [metas, global, municipios] = await Promise.all([
      getMetasResumen(),
      getMetasGlobal(),
      getMunicipiosIntervenidos(),
    ]);
    return NextResponse.json(
      { metas, global, municipios },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Error desconocido" },
      { status: 503 },
    );
  }
}
