// =============================================================================
// GET /api/reportes?tipo=R1[&componente=C1&accion=C1A1]
//
// Devuelve el reporte elegido como CSV descargable. Mismos filtros que la
// página. Reportes vivos: R1, R2, R4, R6, R7, R10.
// =============================================================================

import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import {
  getReporteR1,
  getReporteR2,
  getReporteR4,
  getReporteR6,
  getReporteR7,
  getReporteR10,
  type ReporteFiltros,
} from "@/lib/repos";
import { normalizarAccion } from "@/lib/acciones";
import { REPORTE_LABELS } from "@/lib/constants";
import type { ReporteTipo } from "@/lib/types";
import { toCsv, slugFilename, type CsvCell } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPORTE_FNS: Record<ReporteTipo, (f: ReporteFiltros) => Promise<Record<string, CsvCell>[]>> = {
  R1:  (f) => getReporteR1(f)  as unknown as Promise<Record<string, CsvCell>[]>,
  R2:  (f) => getReporteR2(f)  as unknown as Promise<Record<string, CsvCell>[]>,
  R4:  (f) => getReporteR4(f)  as unknown as Promise<Record<string, CsvCell>[]>,
  R6:  (f) => getReporteR6(f)  as unknown as Promise<Record<string, CsvCell>[]>,
  R7:  ()  => getReporteR7()   as unknown as Promise<Record<string, CsvCell>[]>,
  R10: ()  => getReporteR10()  as unknown as Promise<Record<string, CsvCell>[]>,
};

const COLUMNAS: Record<ReporteTipo, Array<{ key: string; header: string }>> = {
  R1: [
    { key: "idPredio",          header: "ID" },
    { key: "nombrePredio",      header: "Predio" },
    { key: "areaHa",            header: "Área (ha)" },
    { key: "propietario",       header: "Propietario" },
    { key: "telefonoPropietario",header: "Teléfono" },
    { key: "nucleoPredial",     header: "Núcleo predial" },
    { key: "nombreVereda",      header: "Vereda" },
    { key: "nombreMunicipio",   header: "Municipio" },
    { key: "departamento",      header: "Departamento" },
    { key: "cedulaCatastral",   header: "Cédula catastral" },
    { key: "observaciones",     header: "Observaciones" },
  ],
  R2: [
    { key: "idPredio",        header: "ID" },
    { key: "nombrePredio",    header: "Predio" },
    { key: "areaHa",          header: "Área (ha)" },
    { key: "coberturas",      header: "Coberturas CLC" },
    { key: "biomas",          header: "Biomas IAVH" },
    { key: "totalCoberturas", header: "# Coberturas" },
    { key: "totalBiomas",     header: "# Biomas" },
  ],
  R4: [
    { key: "idPredio",     header: "ID Predio" },
    { key: "codigo",       header: "Código" },
    { key: "nombrePredio", header: "Predio" },
    { key: "propietario",  header: "Propietario" },
    { key: "nombreMunicipio", header: "Municipio" },
    { key: "nombreVereda",    header: "Vereda" },
    { key: "nucleoPredial",   header: "Núcleo predial" },
  ],
  R6: [
    { key: "idPredio",          header: "ID" },
    { key: "nombrePredio",      header: "Predio" },
    { key: "nombreVereda",      header: "Vereda" },
    { key: "nucleoPredial",     header: "Núcleo predial" },
    { key: "zonificacionPomca", header: "Zonificación POMCA" },
    { key: "zonificacionRfp",   header: "Zonificación RFP" },
    { key: "paramos",           header: "Páramos" },
  ],
  R7: [
    { key: "nombreMunicipio", header: "Municipio" },
    { key: "departamento",    header: "Departamento" },
    { key: "totalVias",       header: "# Vías" },
    { key: "tiposVia",        header: "Tipos de vía" },
  ],
  R10: [
    { key: "biomaIavh",        header: "Bioma IAVH" },
    { key: "totalPredios",     header: "# Predios" },
    { key: "areaTotalHa",      header: "Área total (ha)" },
    { key: "areaPromedioHa",   header: "Área promedio (ha)" },
    { key: "predios",          header: "Predios" },
  ],
};

function isReporteTipo(s: string | undefined): s is ReporteTipo {
  return s === "R1" || s === "R2" || s === "R4" || s === "R6" || s === "R7" || s === "R10";
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
      { error: "tipo inválido. Permitidos: R1, R2, R4, R6, R7, R10" },
      { status: 400 },
    );
  }

  const componenteRaw = req.nextUrl.searchParams.get("componente");
  const filtros: ReporteFiltros = {
    componente: componenteRaw && /^C[123]$/.test(componenteRaw) ? componenteRaw : null,
    accion: normalizarAccion(req.nextUrl.searchParams.get("accion")),
  };

  try {
    const rows = await REPORTE_FNS[tipo](filtros);
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
