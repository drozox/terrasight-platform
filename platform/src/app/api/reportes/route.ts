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
  getReporteR2,
  getReporteR3,
  getReporteR4,
  getReporteR5,
  getReporteR6,
  getReporteR7,
  getReporteR8,
  getReporteR9,
  getReporteR10,
} from "@/lib/repos";
import { REPORTE_LABELS } from "@/lib/constants";
import type { ReporteTipo } from "@/lib/types";
import { toCsv, slugFilename, type CsvCell } from "@/lib/csv";

export const runtime = "nodejs";

const REPORTE_FNS: Record<ReporteTipo, () => Promise<Record<string, CsvCell>[]>> = {
  R1:  () => getReporteR1()  as unknown as Promise<Record<string, CsvCell>[]>,
  R2:  () => getReporteR2()  as unknown as Promise<Record<string, CsvCell>[]>,
  R3:  () => getReporteR3()  as unknown as Promise<Record<string, CsvCell>[]>,
  R4:  () => getReporteR4()  as unknown as Promise<Record<string, CsvCell>[]>,
  R5:  () => getReporteR5()  as unknown as Promise<Record<string, CsvCell>[]>,
  R6:  () => getReporteR6()  as unknown as Promise<Record<string, CsvCell>[]>,
  R7:  () => getReporteR7()  as unknown as Promise<Record<string, CsvCell>[]>,
  R8:  () => getReporteR8()  as unknown as Promise<Record<string, CsvCell>[]>,
  R9:  () => getReporteR9()  as unknown as Promise<Record<string, CsvCell>[]>,
  R10: () => getReporteR10() as unknown as Promise<Record<string, CsvCell>[]>,
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
  R2: [
    { key: "idPredio",        header: "ID" },
    { key: "nombrePredio",    header: "Predio" },
    { key: "areaHa",          header: "Área (ha)" },
    { key: "coberturas",      header: "Coberturas CLC" },
    { key: "biomas",          header: "Biomas IAVH" },
    { key: "totalCoberturas", header: "# Coberturas" },
    { key: "totalBiomas",     header: "# Biomas" },
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
  R4: [
    { key: "idPredio",          header: "ID Predio" },
    { key: "nombrePredio",      header: "Predio" },
    { key: "idPropuesta",       header: "ID Propuesta" },
    { key: "tipo",              header: "Tipo" },
    { key: "actividad",         header: "Actividad" },
    { key: "componente",        header: "Componente" },
    { key: "accion",            header: "Acción" },
    { key: "nombreQuebrada",    header: "Quebrada" },
    { key: "detalleEspecifico", header: "Detalle específico" },
  ],
  R5: [
    { key: "idPropPunto",            header: "ID Punto" },
    { key: "actividad",              header: "Actividad" },
    { key: "tipoPunto",               header: "Tipo de punto" },
    { key: "este",                    header: "Este" },
    { key: "norte",                   header: "Norte" },
    { key: "nombreQuebrada",          header: "Quebrada" },
    { key: "usuariosBeneficiarios",   header: "Beneficiarios" },
    { key: "totalUsuarios",           header: "# Beneficiarios" },
  ],
  R6: [
    { key: "idPredio",           header: "ID" },
    { key: "nombrePredio",       header: "Predio" },
    { key: "zonificacionPomca",  header: "Zonificación POMCA" },
    { key: "zonificacionRfp",    header: "Zonificación RFP" },
    { key: "paramos",            header: "Páramos" },
  ],
  R7: [
    { key: "nombreMunicipio",        header: "Municipio" },
    { key: "departamento",           header: "Departamento" },
    { key: "totalVias",              header: "# Vías" },
    { key: "totalDrenajesSimples",   header: "# Drenajes simples" },
    { key: "totalDrenajesDobles",    header: "# Drenajes dobles" },
    { key: "tiposVia",               header: "Tipos de vía" },
    { key: "estadosDrenajeSimple",   header: "Estados drenaje simple" },
    { key: "tiposDrenajeDoble",      header: "Tipos drenaje doble" },
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
  R10: [
    { key: "biomaIavh",        header: "Bioma IAVH" },
    { key: "totalPredios",     header: "# Predios" },
    { key: "areaTotalHa",      header: "Área total (ha)" },
    { key: "areaPromedioHa",   header: "Área promedio (ha)" },
    { key: "predios",          header: "Predios" },
  ],
};

function isReporteTipo(s: string | undefined): s is ReporteTipo {
  return s === "R1" || s === "R2" || s === "R3" || s === "R4" || s === "R5"
      || s === "R6" || s === "R7" || s === "R8" || s === "R9" || s === "R10";
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
      { error: "tipo inválido. Permitidos: R1, R2, R3, R4, R5, R6, R7, R8, R9, R10" },
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
