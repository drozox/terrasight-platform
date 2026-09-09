// =============================================================================
// POST /api/importaciones — Importar CSV de predios
//
// Body:
//   {
//     "tipo_entidad": "predio",
//     "nombre_archivo": "predios-2026-09-08.csv",
//     "csv_text": "nombre_predio;area_ha;id_municipio;id_vereda;id_propietario\n...",
//     "comentario": "Carga inicial"  // opcional
//   }
//
// Response:
//   {
//     "id_importacion": 1,
//     "total_filas": 10,
//     "filas_exitosas": 8,
//     "filas_con_error": 2,
//     "estado": "COMPLETADO_CON_ERRORES"
//   }
//
// Sprint 21 — MVP: solo predios. Propuestas y otras entidades en sprint futuro.
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { parseCsv } from "@/lib/csv";
import {
  validatePredioRow,
  commitPrediosImport,
} from "@/lib/repos/importaciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TIPOS = ["predio"] as const;
type TipoPermitido = (typeof ALLOWED_TIPOS)[number];

function isTipoPermitido(s: unknown): s is TipoPermitido {
  return typeof s === "string" && (ALLOWED_TIPOS as readonly string[]).includes(s);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (user.rol !== "ADMIN" && user.rol !== "GESTOR") {
    return NextResponse.json({ error: "Solo ADMIN/GESTOR pueden importar" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido (JSON requerido)" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body debe ser un objeto" }, { status: 400 });
  }
  const { tipo_entidad, nombre_archivo, csv_text, comentario } = body as Record<string, unknown>;

  if (!isTipoPermitido(tipo_entidad)) {
    return NextResponse.json(
      { error: `tipo_entidad debe ser uno de: ${ALLOWED_TIPOS.join(", ")}` },
      { status: 400 },
    );
  }
  if (typeof nombre_archivo !== "string" || nombre_archivo.length < 1 || nombre_archivo.length > 255) {
    return NextResponse.json({ error: "nombre_archivo requerido (1-255 chars)" }, { status: 400 });
  }
  if (typeof csv_text !== "string") {
    return NextResponse.json({ error: "csv_text requerido (string)" }, { status: 400 });
  }
  if (csv_text.length > MAX_CSV_BYTES) {
    return NextResponse.json(
      { error: `CSV demasiado grande (máx ${MAX_CSV_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }
  if (typeof comentario !== "string" && comentario !== undefined) {
    return NextResponse.json({ error: "comentario debe ser string" }, { status: 400 });
  }

  const { rows, headers } = parseCsv(csv_text);
  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV sin filas de datos" }, { status: 400 });
  }
  // Validar que tenga las columnas esperadas
  const requiredCols = ["nombre_predio"];
  for (const col of requiredCols) {
    if (!headers.includes(col)) {
      return NextResponse.json(
        { error: `Falta columna requerida: ${col}` },
        { status: 400 },
      );
    }
  }

  // Validar fila por fila
  const validations = rows.map((r, i) => ({
    fila: i + 2,  // +2 porque fila 1 = header
    ...validatePredioRow(r, i + 2),
  }));
  const validRows = validations.map((v) => v.valid);

  try {
    const result = await commitPrediosImport({
      rows: validRows,
      validations: validations.map((v) => ({ fila: v.fila, errors: v.errors })),
      nombreArchivo: nombre_archivo,
      usuario: user.email,
      comentario: comentario as string | undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/importaciones] error:", (err as Error).message);
    return NextResponse.json({ error: "Error al importar" }, { status: 503 });
  }
}
