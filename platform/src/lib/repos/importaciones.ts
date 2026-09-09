// =============================================================================
// importaciones — bulk import de predios / propuestas desde CSV
//
// Sprint 21 (P1 del plan v1.0). Endpoints MVP:
//   - parsePrediosCsv()    parsea CSV de predios, valida, devuelve errores
//   - commitPrediosImport() inserta filas válidas a sgs_pre_predio
//   - listImportaciones()  historial de importaciones del usuario
//
// Tablas:
//   - sgs_adm_importacion (header con estado + totales)
//   - sgs_adm_importacion_error (1 fila por error de validación)
//
// CSV esperado para predios:
//   nombre_predio;area_ha;id_vereda;id_propietario
//   "Predio El Carmen";12.5;5;3
//
// El campo geom NO se acepta por CSV — se debe usar la herramienta de dibujo
// en el mapa para asignar geometría. id_municipio se deriva via id_vereda.
// =============================================================================

import { sql, pgInt } from "../db";

export type ImportEstado =
  | "EN_PROCESO"
  | "COMPLETADO"
  | "COMPLETADO_CON_ERRORES"
  | "FALLIDO";

export interface ImportacionRow {
  id_importacion: number;
  tipo_entidad: string;
  nombre_archivo: string;
  usuario: string;
  estado: ImportEstado;
  total_filas: number;
  filas_exitosas: number;
  filas_con_error: number;
  comentario: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ImportErrorRow {
  id_error: number;
  fila: number;
  columna: string | null;
  valor: string | null;
  mensaje: string;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Predios: validación + commit
// -----------------------------------------------------------------------------

export interface PredioCsvRow {
  nombre_predio: string;
  area_ha: number | null;
  id_vereda: number | null;
  id_propietario: number | null;
}

export interface PredioValidation {
  valid: PredioCsvRow;
  errors: { columna: string; mensaje: string }[];
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isPositiveInt(v: unknown): v is number {
  return isFiniteNumber(v) && Number.isInteger(v) && v > 0;
}

export function validatePredioRow(
  raw: Record<string, string>,
  fila: number,
): { valid: PredioCsvRow; errors: { columna: string; mensaje: string }[] } {
  const errors: { columna: string; mensaje: string }[] = [];
  const nombre = (raw.nombre_predio ?? "").trim();
  if (!nombre) {
    errors.push({ columna: "nombre_predio", mensaje: "nombre_predio requerido" });
  }
  let areaHa: number | null = null;
  const areaStr = (raw.area_ha ?? "").replace(",", ".");
  if (areaStr) {
    const n = Number(areaStr);
    if (!Number.isFinite(n) || n < 0) {
      errors.push({ columna: "area_ha", mensaje: `area_ha inválido: "${raw.area_ha}"` });
    } else {
      areaHa = n;
    }
  }
  const idVeredaRaw = (raw.id_vereda ?? "").trim();
  let idVereda: number | null = null;
  if (idVeredaRaw) {
    const n = Number(idVeredaRaw);
    if (!isPositiveInt(n)) {
      errors.push({ columna: "id_vereda", mensaje: `id_vereda inválido: "${idVeredaRaw}"` });
    } else {
      idVereda = n;
    }
  }
  const idPropRaw = (raw.id_propietario ?? "").trim();
  let idPropietario: number | null = null;
  if (idPropRaw) {
    const n = Number(idPropRaw);
    if (!isPositiveInt(n)) {
      errors.push({ columna: "id_propietario", mensaje: `id_propietario inválido: "${idPropRaw}"` });
    } else {
      idPropietario = n;
    }
  }
  return {
    valid: { nombre_predio: nombre, area_ha: areaHa, id_vereda: idVereda, id_propietario: idPropietario },
    errors,
  };
}

export interface CommitResult {
  id_importacion: number;
  total_filas: number;
  filas_exitosas: number;
  filas_con_error: number;
  estado: ImportEstado;
}

export async function commitPrediosImport(opts: {
  rows: PredioCsvRow[];
  validations: { fila: number; errors: { columna: string; mensaje: string }[] }[];
  nombreArchivo: string;
  usuario: string;
  comentario?: string;
}): Promise<CommitResult> {
  // 1. Crear header de importación
  const [importRow] = await sql<Array<{ id_importacion: number }>>`
    INSERT INTO sgs_adm_importacion (tipo_entidad, nombre_archivo, usuario, estado, total_filas)
    VALUES ('predio', ${opts.nombreArchivo}, ${opts.usuario}, 'EN_PROCESO', ${opts.rows.length})
    RETURNING id_importacion
  `;
  const idImport = pgInt(importRow.id_importacion);

  let exitosas = 0;
  let conError = 0;

  // 2. Insertar errores primero (si los hay)
  const allErrors: { fila: number; columna: string | null; mensaje: string; valor: string | null }[] = [];
  for (const v of opts.validations) {
    for (const e of v.errors) {
      const valor = opts.rows[v.fila - 1]
        ? (opts.rows[v.fila - 1] as unknown as Record<string, unknown>)[e.columna] != null
          ? String((opts.rows[v.fila - 1] as unknown as Record<string, unknown>)[e.columna])
          : null
        : null;
      allErrors.push({ fila: v.fila, columna: e.columna, mensaje: e.mensaje, valor });
    }
  }

  // 3. Insertar las filas válidas
  for (let i = 0; i < opts.rows.length; i++) {
    const v = opts.validations[i];
    if (v && v.errors.length > 0) {
      conError++;
      continue;
    }
    const row = opts.rows[i];
    if (!row || !row.nombre_predio) {
      conError++;
      continue;
    }
    try {
      // Generar cedula_catastral temporal con prefijo IMP- + id de la importacion
      // (se puede reasignar después). cedula_ant = '' (default no nullable).
      await sql`
        INSERT INTO sgs_pre_predio (
          nombre_predio, area_ha, cedula_catastral, cedula_ant,
          nucleo_predial, longitud_centroide, latitud_centroide, id_vereda, id_propietario
        )
        VALUES (
          ${row.nombre_predio},
          ${row.area_ha ?? 0},
          ${'IMP-' + idImport + '-' + (i + 1)},
          ${''},
          ${''},
          ${0}, ${0},
          ${row.id_vereda},
          ${row.id_propietario}
        )
      `;
      exitosas++;
    } catch (err) {
      conError++;
      const msg = (err as Error).message;
      console.error(`[importaciones] error fila ${i + 1} (${row.nombre_predio}):`, msg);
      allErrors.push({
        fila: i + 2,  // +2 porque fila 1 = header
        columna: null,
        mensaje: `Error al insertar: ${msg}`,
        valor: row.nombre_predio,
      });
    }
  }

  // 4. Insertar errores en batch
  if (allErrors.length > 0) {
    for (const e of allErrors) {
      await sql`
        INSERT INTO sgs_adm_importacion_error (id_importacion, fila, columna, valor, mensaje)
        VALUES (${idImport}, ${e.fila}, ${e.columna}, ${e.valor}, ${e.mensaje})
      `;
    }
  }

  // 5. Cerrar header
  const estado: ImportEstado =
    conError === 0 ? "COMPLETADO" :
    exitosas === 0 ? "FALLIDO" : "COMPLETADO_CON_ERRORES";

  await sql`
    UPDATE sgs_adm_importacion
    SET estado = ${estado},
        filas_exitosas = ${exitosas},
        filas_con_error = ${conError},
        completed_at = now(),
        comentario = ${opts.comentario ?? null}
    WHERE id_importacion = ${idImport}
  `;

  return {
    id_importacion: idImport,
    total_filas: opts.rows.length,
    filas_exitosas: exitosas,
    filas_con_error: conError,
    estado,
  };
}

// -----------------------------------------------------------------------------
// Historial
// -----------------------------------------------------------------------------

export async function listImportaciones(limit = 50): Promise<ImportacionRow[]> {
  const rows = await sql<Array<{
    id_importacion: number;
    tipo_entidad: string;
    nombre_archivo: string;
    usuario: string;
    estado: string;
    total_filas: number;
    filas_exitosas: number;
    filas_con_error: number;
    comentario: string | null;
    created_at: string;
    completed_at: string | null;
  }>>`
    SELECT id_importacion, tipo_entidad, nombre_archivo, usuario, estado,
           total_filas, filas_exitosas, filas_con_error, comentario,
           created_at, completed_at
    FROM sgs_adm_importacion
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id_importacion: pgInt(r.id_importacion),
    tipo_entidad: r.tipo_entidad,
    nombre_archivo: r.nombre_archivo,
    usuario: r.usuario,
    estado: r.estado as ImportEstado,
    total_filas: pgInt(r.total_filas),
    filas_exitosas: pgInt(r.filas_exitosas),
    filas_con_error: pgInt(r.filas_con_error),
    comentario: r.comentario,
    created_at: r.created_at,
    completed_at: r.completed_at,
  }));
}

export async function getImportacion(id: number): Promise<{
  importacion: ImportacionRow | null;
  errors: ImportErrorRow[];
}> {
  const [header] = await sql<Array<{
    id_importacion: number;
    tipo_entidad: string;
    nombre_archivo: string;
    usuario: string;
    estado: string;
    total_filas: number;
    filas_exitosas: number;
    filas_con_error: number;
    comentario: string | null;
    created_at: string;
    completed_at: string | null;
  }>>`
    SELECT id_importacion, tipo_entidad, nombre_archivo, usuario, estado,
           total_filas, filas_exitosas, filas_con_error, comentario,
           created_at, completed_at
    FROM sgs_adm_importacion
    WHERE id_importacion = ${id}
  `;
  if (!header) return { importacion: null, errors: [] };
  const errRows = await sql<Array<{
    id_error: number;
    fila: number;
    columna: string | null;
    valor: string | null;
    mensaje: string;
    created_at: string;
  }>>`
    SELECT id_error, fila, columna, valor, mensaje, created_at
    FROM sgs_adm_importacion_error
    WHERE id_importacion = ${id}
    ORDER BY fila, id_error
    LIMIT 500
  `;
  return {
    importacion: {
      id_importacion: pgInt(header.id_importacion),
      tipo_entidad: header.tipo_entidad,
      nombre_archivo: header.nombre_archivo,
      usuario: header.usuario,
      estado: header.estado as ImportEstado,
      total_filas: pgInt(header.total_filas),
      filas_exitosas: pgInt(header.filas_exitosas),
      filas_con_error: pgInt(header.filas_con_error),
      comentario: header.comentario,
      created_at: header.created_at,
      completed_at: header.completed_at,
    },
    errors: errRows.map((e) => ({
      id_error: pgInt(e.id_error),
      fila: pgInt(e.fila),
      columna: e.columna,
      valor: e.valor,
      mensaje: e.mensaje,
      created_at: e.created_at,
    })),
  };
}
