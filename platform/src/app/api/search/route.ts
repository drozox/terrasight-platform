// =============================================================================
// GET /api/search?q=... — búsqueda transversal con pg_trgm + unaccent
//
// Sprint 19 — UX-61 (audit 2026-07-24) hotfix. Reemplaza el placeholder
// del topbar por un dropdown con resultados de 5 tablas:
// predios, propuestas, municipios, veredas, propietarios.
//
// Query params:
//   q       (string, requerido)  texto a buscar (mín 2 chars)
//
// Response:
//   { results: [{ tipo, id, label, sublabel?, href, score }, ...] }
//
// Errores:
//   400 si q falta o tiene < 2 chars
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { searchAll, type SearchResult } from "@/lib/repos/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] as SearchResult[] });
  }
  if (q.length > 100) {
    return NextResponse.json({ error: "q demasiado largo (máx 100)" }, { status: 400 });
  }

  try {
    const results = await searchAll(q);
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "private, max-age=30" } },
    );
  } catch (err) {
    console.error("[api/search] error:", (err as Error).message);
    return NextResponse.json({ error: "Error al buscar" }, { status: 503 });
  }
}
