// =============================================================================
// ReporteViewer — render server del reporte elegido.
//
// Cada "tipo" define su propia lista de columnas; evitamos `any`.
// =============================================================================

import { formatInt, formatDecimal } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ReporteTipo } from "@/lib/types";

type Column = { key: string; label: string; align?: "left" | "right" | "center" };

const COLUMNAS: Record<ReporteTipo, Column[]> = {
  R1: [
    { key: "idPredio",            label: "ID" },
    { key: "nombrePredio",        label: "Predio" },
    { key: "areaHa",              label: "Área (ha)",       align: "right" },
    { key: "propietario",         label: "Propietario" },
    { key: "telefonoPropietario", label: "Teléfono" },
    { key: "nucleoPredial",       label: "Núcleo predial" },
    { key: "nombreVereda",        label: "Vereda" },
    { key: "nombreMunicipio",     label: "Municipio" },
    { key: "departamento",        label: "Departamento" },
    { key: "cedulaCatastral",     label: "Cédula catastral" },
    { key: "observaciones",       label: "Observaciones" },
  ],
  R2: [
    { key: "idPredio",        label: "ID" },
    { key: "nombrePredio",    label: "Predio" },
    { key: "areaHa",          label: "Área (ha)",   align: "right" },
    { key: "coberturas",      label: "Coberturas CLC" },
    { key: "biomas",          label: "Biomas IAVH" },
    { key: "totalCoberturas", label: "# Cob.",       align: "right" },
    { key: "totalBiomas",     label: "# Biom.",      align: "right" },
  ],
  R4: [
    { key: "codigo",          label: "Código" },
    { key: "nombrePredio",    label: "Nombre" },
    { key: "propietario",     label: "Propietario" },
    { key: "nombreMunicipio", label: "Municipio" },
    { key: "nombreVereda",    label: "Vereda" },
    { key: "nucleoPredial",   label: "Núcleo predial" },
  ],
  R6: [
    { key: "idPredio",          label: "ID" },
    { key: "nombrePredio",      label: "Predio" },
    { key: "nombreVereda",      label: "Vereda" },
    { key: "nucleoPredial",     label: "Núcleo predial" },
    { key: "zonificacionPomca", label: "Zonif. POMCA" },
    { key: "zonificacionRfp",   label: "Zonif. RFP" },
    { key: "paramos",           label: "Páramos" },
  ],
  R7: [
    { key: "nombreMunicipio", label: "Municipio" },
    { key: "departamento",    label: "Depto." },
    { key: "totalVias",       label: "# Vías", align: "right" },
    { key: "tiposVia",        label: "Tipos vía" },
  ],
  R10: [
    { key: "biomaIavh",       label: "Bioma IAVH" },
    { key: "totalPredios",    label: "# Predios",   align: "right" },
    { key: "areaTotalHa",     label: "Área total",  align: "right" },
    { key: "areaPromedioHa",  label: "Área prom.",  align: "right" },
    { key: "predios",         label: "Predios" },
  ],
  R11: [
    { key: "municipio", label: "Municipio" },
    { key: "vereda",    label: "Vereda" },
    { key: "predios",   label: "Predios",    align: "right" },
    { key: "areaHa",    label: "Área (ha)",  align: "right" },
  ],
};

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    // Si parece un id (entero grande), sin separadores de miles. Si es
    // área o monto, con 2 decimales locales.
    if (Number.isInteger(value) && value > 100) return formatInt(value);
    return formatDecimal(value, 2);
  }
  return String(value);
}

export function ReporteViewer({
  tipo,
  filas,
}: {
  tipo: ReporteTipo;
  filas: unknown[];
}) {
  const cols = COLUMNAS[tipo];

  if (filas.length === 0) {
    return (
      <p className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-6 text-center text-body-sm text-on-surface-variant">
        Sin datos para este reporte. Verificá que las tablas referenciadas
        estén pobladas en la BD.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-body-sm">
        <thead>
          <tr className="bg-surface-container-low text-[11px] uppercase tracking-wider text-on-surface-variant print:bg-gray-100">
            {cols.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "border border-outline-variant px-3 py-2 font-semibold",
                  c.align === "right" ? "text-right" : "text-left",
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((rawRow, idx) => {
            const r = rawRow as Record<string, unknown>;
            return (
              <tr key={idx} className="border-b border-outline-variant/40">
                {cols.map((c) => {
                  const value = r[c.key];
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        "border border-outline-variant/30 px-3 py-2 align-top",
                        c.align === "right" ? "text-right font-mono text-[12px]" : "",
                        typeof value === "number" && c.align === "right" ? "text-on-surface" : "",
                      )}
                    >
                      {formatCell(value)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-3 text-[11px] text-on-surface-variant print:hidden">
        Tip: usá <strong>Imprimir / PDF</strong> arriba para guardar el
        reporte como PDF desde el navegador (Ctrl/Cmd+P → Guardar como PDF).
      </p>
    </div>
  );
}
