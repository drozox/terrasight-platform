// =============================================================================
// GET /api/health — health check público (sin auth).
//
// Sirve para:
//   - Uptime monitoring (Pingdom, UptimeRobot, Vercel checks).
//   - Cron que evita la pausa del free tier de Supabase (pega cada N días).
//
// No expone datos: solo verifica que la conexión a la BD responda (SELECT 1).
// 200 → OK; 503 → BD caída.
// =============================================================================

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const t0 = Date.now();
  try {
    await sql`SELECT 1 AS ok`;
    return NextResponse.json(
      { ok: true, db: "up", latencyMs: Date.now() - t0, ts: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: "down", error: (err as Error).message, ts: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
