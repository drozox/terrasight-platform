// =============================================================================
// GET /api/reportes?tipo=R1
//
// Devuelve el reporte elegido como CSV descargable.
// Séparation of concerns: la página renderiza HTML (para vista + print a
// PDF); este endpoint es para descarga directa. Ambos usan el mismo repo.
// =============================================================================

import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import {
  getReporteR1,
  getReporteR3,
  getReporteR8,
  getReporteR9,
  type ReporteTipo,
  REPORTE_LABELS,
} from "@/lib/repository";
import { toCsv, slugFilename, type CsvCell } from "@/lib/csv";

export const runtime = "nodejs";

const REPORTE_FNS: Record<ReporteTipo, () => Promise<Record<string, CsvCell>[]>> = {
  R1: () => getReporteR1() as unknown as Promise<Record<string, CsvCell>[]>,
  R3: () => getReporteR3() as unknown as Promise<Record<string, CsvCell>[]>,
  R8: () => getReporteR8() as unknown as Promise<Record<string, CsvCell>[]>,
  R9: () => getReporteR9() as unknown as Promise<Record<string, CsvCell>[]>,
};

const COLUMNAS: Record<ReporteTipo, Array<{ key: string; header: string }>> = {
  R1: [
    { key: "idPredio",          header: "ID" },
    { key: "nombrePredio",      header: "Predio" },
    { key: "areaHa",            header: "Área (ha)" },
    { key: "propietario",       header: "Propietario" },
    { key: "telefonoPropietario",header: "Teléfono" },
    { key: "nombreVereda",      header: "Vereda" },
    { key: "nombreMunicipio",   header: "Municipio" },
    { key: "departamento",      header: "Departamento" },
    { key: "cedulaCatastral",   header: "Cédula catastral" },
    { key: "observaciones",     header: "Observaciones" },
  ],
  R3: [
    { key: "componente",        header: "Componente" },
    { key: "accion",            header: "Acción" },
    { key: "totalPropuestas",   header: "Total propuestas" },
    { key: "propuestasPunto",   header: "Punto" },
    { key: "propuestasLinea",   header: "Línea" },
    { key: "propuestasPoligono",header: "Polígono" },
    { key: "tiposPresentes",    header: "Tipos presentes" },
  ],
  R8: [
    { key: "componente",            header: "Componente" },
    { key: "prediosConPropuestas",  header: "Predios con propuestas" },
    { key: "totalPropuestas",       header: "Total propuestas" },
    { key: "punto",                 header: "Punto" },
    { key: "linea",                 header: "Línea" },
    { key: "poligono",              header: "Polígono" },
  ],
  R9: [
    { key: "idQuebrada",         header: "ID" },
    { key: "nombreQuebrada",     header: "Quebrada" },
    { key: "nombreMunicipio",    header: "Municipio" },
    { key: "area",               header: "Área (ha)" },
    { key: "totalPropuestas",    header: "Total propuestas" },
    { key: "propuestasPunto",    header: "Punto" },
    { key: "propuestasLinea",    header: "Línea" },
    { key: "propuestasPoligono", header: "Polígono" },
  ],
};

function isReporteTipo(s: string | undefined): s is ReporteTipo {
  return s === "R1" || s === "R3" || s === "R8" || s === "R9";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.rol !== "ADMIN" && user.rol !== "ANALISTA") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const tipo = req.nextUrl.searchParams.get("tipo");
  if (!tipo || !isReporteTipo(tipo)) {
    return NextResponse.json(
      { error: "tipo inválido. Permitidos: R1, R3, R8, R9" },
      { status: 400 },
    );
  }

  try {
    const rows = await REPORTE_FNS[tipo]();
    const csv = toCsv(rows, COLUMNAS[tipo]);
    const filename = slugFilename(REPORTE_LABELS[tipo], "csv");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/reportes] error:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "Error generando el reporte" },
      { status: 503 },
    );
  }
}
