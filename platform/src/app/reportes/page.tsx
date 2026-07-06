// =============================================================================
// /reportes — Selector + render del reporte (HU-CO-04).
// Server Component: cada ?tipo=R1|R3|R8|R9 corre la query apropiada.
// CSV se descarga desde /api/reportes, no acá.
// =============================================================================

import Link from "next/link";
import { FileText, FileDown, Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth-guard";
import {
  type ReporteTipo,
  REPORTE_LABELS,
  REPORTE_DESCRIPCIONES,
  getReporteR1,
  getReporteR3,
  getReporteR8,
  getReporteR9,
} from "@/lib/repository";
import { ReporteSelector } from "./reporte-selector";
import { ReporteViewer } from "./reporte-viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reportes — TerraSight" };

const RENDERERS: Record<ReporteTipo, () => Promise<unknown[]>> = {
  R1: () => getReporteR1() as unknown as Promise<unknown[]>,
  R3: () => getReporteR3() as unknown as Promise<unknown[]>,
  R8: () => getReporteR8() as unknown as Promise<unknown[]>,
  R9: () => getReporteR9() as unknown as Promise<unknown[]>,
};

function isReporteTipo(s: string | undefined): s is ReporteTipo {
  return s === "R1" || s === "R3" || s === "R8" || s === "R9";
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  await requireRole(["ADMIN", "ANALISTA"] as const);
  const sp = await searchParams;
  const tipoInicial: ReporteTipo | null = isReporteTipo(sp.tipo) ? sp.tipo : "R1";
  const filas = tipoInicial ? await RENDERERS[tipoInicial]() : [];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-surface-container-low px-margin-edge py-6 print:bg-white">
      <header className="mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
            <FileText className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Reportes operativos</h1>
            <p className="text-body-sm text-on-surface-variant">
              Generación de reportes basada en las consultas oficiales del
              modelo BDG (DOCS/7. Consultas y Vistas/Consultas_Reportes.sql).
              Vista en pantalla + descarga CSV + impresión a PDF desde el
              navegador.
            </p>
          </div>
        </div>
      </header>

      <ReporteSelector tipoInicial={tipoInicial ?? "R1"} />

      {tipoInicial && (
        <Card className="mt-6 p-6 print:border-none print:shadow-none">
          <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-title-lg font-bold text-on-surface">
                {REPORTE_LABELS[tipoInicial]}
              </h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                {REPORTE_DESCRIPCIONES[tipoInicial]}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-wider text-on-surface-variant">
                Generado {new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}
                {" · "}
                {filas.length} fila{filas.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button asChild variant="secondary">
                <a href={`/api/reportes?tipo=${tipoInicial}`} download>
                  <FileDown className="size-4" />
                  Descargar CSV
                </a>
              </Button>
              <Button onClick={() => window.print()} variant="outline">
                <Printer className="size-4" />
                Imprimir / PDF
              </Button>
            </div>
          </header>

          <ReporteViewer tipo={tipoInicial} filas={filas} />
        </Card>
      )}

      <footer className="mt-10 border-t border-outline-variant pt-4 text-[11px] text-on-surface-variant print:hidden">
        Próximos reportes (DOCS/7): R2 (predios+coberturas), R4 (propuestas por
        predio), R5 (puntos+beneficiarios), R6 (zonificaciones), R7
        (infraestructura), R10 (área por bioma). Se pueden agregar al
        selector sin más trabajo de UI — la pipeline CSV ya está abierta.
      </footer>
    </div>
  );
}
