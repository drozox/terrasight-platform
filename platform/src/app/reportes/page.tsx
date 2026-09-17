// =============================================================================
// /reportes — Selector + filtros + render del reporte (HU-CO-04).
// Server Component: cada ?tipo=Rx corre la query apropiada.
//   - R1, R2, R4, R6 aceptan filtro por componente/acción (?componente=&accion=).
//   - R4 usa un client component con subpestaña "Ver intervenciones".
// CSV se descarga desde /api/reportes, no acá.
// =============================================================================

import Link from "next/link";
import { FileText, FileDown, Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth-guard";
import { REPORTE_LABELS, REPORTE_DESCRIPCIONES } from "@/lib/constants";
import type { ReporteTipo, ReporteR4Fila } from "@/lib/types";
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
import { ReporteSelector } from "./reporte-selector";
import { ReporteFiltrosBar } from "./reporte-filtros";
import { ReporteViewer } from "./reporte-viewer";
import { ReporteR4Viewer } from "./reporte-r4";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reportes — SIG TERRITORIO" };

const RENDERERS: Record<ReporteTipo, (f: ReporteFiltros) => Promise<unknown[]>> = {
  R1:  (f) => getReporteR1(f) as unknown as Promise<unknown[]>,
  R2:  (f) => getReporteR2(f) as unknown as Promise<unknown[]>,
  R4:  (f) => getReporteR4(f) as unknown as Promise<unknown[]>,
  R6:  (f) => getReporteR6(f) as unknown as Promise<unknown[]>,
  R7:  ()  => getReporteR7()  as unknown as Promise<unknown[]>,
  R10: ()  => getReporteR10() as unknown as Promise<unknown[]>,
};

// Reportes que soportan filtro por componente/acción.
const CON_FILTRO: ReporteTipo[] = ["R1", "R2", "R4", "R6"];

function isReporteTipo(s: string | undefined): s is ReporteTipo {
  return s === "R1" || s === "R2" || s === "R4" || s === "R6" || s === "R7" || s === "R10";
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; componente?: string; accion?: string }>;
}) {
  await requireRole(["ADMIN", "ANALISTA"] as const);
  const sp = await searchParams;
  const tipoInicial: ReporteTipo = isReporteTipo(sp.tipo) ? sp.tipo : "R1";
  const componente =
    sp.componente && /^C[123]$/.test(sp.componente) ? sp.componente : null;
  const accion = normalizarAccion(sp.accion);
  const filtros: ReporteFiltros = { componente, accion };

  const filas = await RENDERERS[tipoInicial](filtros);

  const csvParams = new URLSearchParams({ tipo: tipoInicial });
  if (componente) csvParams.set("componente", componente);
  if (accion) csvParams.set("accion", accion);

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
              modelo BDG. Vista en pantalla + descarga CSV + impresión a PDF
              desde el navegador.
            </p>
          </div>
        </div>
      </header>

      <ReporteSelector tipoInicial={tipoInicial} />

      {CON_FILTRO.includes(tipoInicial) && (
        <ReporteFiltrosBar
          tipo={tipoInicial}
          componente={componente}
          accion={accion}
        />
      )}

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
              {componente ? ` · ${componente}` : ""}
              {accion ? ` · ${accion}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button asChild variant="secondary">
              <a href={`/api/reportes?${csvParams.toString()}`} download>
                <FileDown className="size-4" />
                Descargar CSV
              </a>
            </Button>
            <PrintButton variant="outline">
              <Printer className="size-4" />
              Imprimir / PDF
            </PrintButton>
          </div>
        </header>

        {tipoInicial === "R4" ? (
          <ReporteR4Viewer filas={filas as ReporteR4Fila[]} />
        ) : (
          <ReporteViewer tipo={tipoInicial} filas={filas} />
        )}
      </Card>

      <footer className="mt-10 border-t border-outline-variant pt-4 text-[11px] text-on-surface-variant print:hidden">
        6 reportes operativos, basados en las consultas oficiales del modelo BDG
        del convenio CAR-WWF-Fundación Natura.
      </footer>
    </div>
  );
}
