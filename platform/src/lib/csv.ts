// =============================================================================
// Utilidad CSV — convierte filas planas a string CSV RFC 4180-compatible.
//
// Por qué no usamos una lib externa (csv-parse, papaparse): son ~50kb cada
// una para algo que son 25 líneas. Sólo emitimos CSV, no parseamos.
//
// Frontmatter:
//   - Separador: `;` para que Excel en español lo abra en columnas (la coma
//     tiene conflicto con decimales). Configurable.
//   - Quoting: cualquier campo que contenga separador, salto de línea o
//     comilla doble se envuelve en `"..."` con comillas duplicadas (").
//   - Header: primera fila con nombres de columnas.
//   - BOM opcional (prefijo \uFEFF) — Excel necesita BOM para detectar UTF-8.
//     Por defecto ON para que los acentos y ñ se vean bien.
// =============================================================================

export type CsvCell = string | number | boolean | null | undefined;

export type CsvOptions = {
  separator?: string;
  bom?: boolean;
  lineEnding?: "\n" | "\r\n";
};

/** Escapa un valor individual para CSV. */
function escapeCell(value: CsvCell, separator: string): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : String(value);
  const needsQuote = s.includes(separator) || s.includes('"') || /[\r\n]/.test(s);
  if (!needsQuote) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Genera string CSV a partir de header + filas. */
export function toCsv<T extends Record<string, CsvCell>>(
  rows: T[],
  columns?: Array<{ key: keyof T; header: string }>,
  options: CsvOptions = {},
): string {
  const separator = options.separator ?? ";";
  const bom = options.bom ?? true;
  const lineEnding = options.lineEnding ?? "\n";

  const cols: Array<{ key: keyof T; header: string }> =
    columns ?? (rows[0]
      ? (Object.keys(rows[0]).map((k) => ({ key: k as keyof T, header: k })))
      : []);
  if (cols.length === 0) return (bom ? "\uFEFF" : "") + "";

  const lines: string[] = [];
  // Header
  lines.push(cols.map((c) => escapeCell(c.header, separator)).join(separator));
  // Filas
  for (const row of rows) {
    const out: string[] = [];
    for (const c of cols) {
      out.push(escapeCell(row[c.key] as CsvCell, separator));
    }
    lines.push(out.join(separator));
  }
  return (bom ? "\uFEFF" : "") + lines.join(lineEnding);
}

/** Slug para nombre de archivo: "Reporte R1 2026-07-06" → "reporte-r1-2026-07-06". */
export function slugFilename(label: string, ext: string): string {
  const slug = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = new Date().toISOString().slice(0, 10);
  return `${slug}-${date}.${ext}`;
}
