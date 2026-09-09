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

// =============================================================================
// Parser CSV — Sprint 21
//
// Parser RFC 4180-compatible sin dependencias externas.
// Maneja:
//   - separador configurable (default `;` para Excel es)
//   - comillas dobles escapadas ("" → ")
//   - comillas que encierran campos con separador o saltos de línea
//   - BOM UTF-8 al inicio
//   - line endings \n, \r\n
// =============================================================================

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsv(input: string, separator: string = ";"): ParsedCsv {
  // Strip BOM
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === separator) { cur.push(field); field = ""; }
      else if (ch === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (ch === "\r") {
        if (text[i + 1] === "\n") i++;
        cur.push(field); rows.push(cur); cur = []; field = "";
      }
      else { field += ch; }
    }
  }
  // Última fila sin newline
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }

  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => h.trim());
  const dataRows: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].length === 1 && rows[i][0] === "") continue; // skip empty
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = (rows[i][j] ?? "").trim();
    }
    dataRows.push(obj);
  }
  return { headers, rows: dataRows };
}
