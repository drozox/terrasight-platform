// =============================================================================
// Predios CRUD (HU-TC-01) + Catálogos secundarios Veredas (HU-TC-07) y
// Propietarios (HU-TC-08).
//
// Reglas del split:
//   - Solo importa de `./_helpers`, `./types`, `../db`. Nunca de otro
//     `repos/*.ts`.
//   - `pgInt`/`pgNum`/`pgText`/`pgDate`/`sql` desde `../db`.
// =============================================================================

import { sql, pgInt, pgNum, pgText, pgDate } from "../db";
import { withFallback, isValidTelefono } from "./_helpers";
import type {
  PredioFull,
  PropietarioMini,
  PropietarioFull,
  PropietarioInput,
  VeredaMini,
  VeredaFull,
  VeredaInput,
} from "../types";

// =============================================================================
// Predios (HU-TC-01)
// =============================================================================

type PredioRow = {
  id_predio: number | string;
  nombre_predio: string;
  area_ha: number | string;
  cedula_catastral: string;
  cedula_ant: string;
  longitud_centroide: number | string;
  latitud_centroide: number | string;
  nucleo_predial: string;
  observaciones: string;
  perimetro: number | string;
  id_propietario: number | string;
  id_vereda: number | string;
};

function mapPredioRow(r: PredioRow): PredioFull {
  return {
    idPredio: pgInt(r.id_predio),
    nombrePredio: pgText(r.nombre_predio),
    areaHa: pgNum(r.area_ha),
    cedulaCatastral: pgText(r.cedula_catastral),
    cedulaAnt: pgText(r.cedula_ant),
    longitudCentroide: pgNum(r.longitud_centroide),
    latitudCentroide: pgNum(r.latitud_centroide),
    nucleoPredial: pgText(r.nucleo_predial),
    observaciones: pgText(r.observaciones),
    perimetro: pgNum(r.perimetro),
    idPropietario: pgInt(r.id_propietario),
    idVereda: pgInt(r.id_vereda),
  };
}

export async function listPredios(): Promise<PredioFull[]> {
  const rows = await sql<PredioRow[]>`
    SELECT id_predio, nombre_predio, area_ha, cedula_catastral, cedula_ant,
           longitud_centroide, latitud_centroide, nucleo_predial,
           observaciones, perimetro, id_propietario, id_vereda
    FROM   sgs_pre_predio
    ORDER  BY nombre_predio;
  `;
  return rows.map(mapPredioRow);
}

export async function getPredioById(id: number): Promise<PredioFull | null> {
  const rows = await sql<PredioRow[]>`
    SELECT id_predio, nombre_predio, area_ha, cedula_catastral, cedula_ant,
           longitud_centroide, latitud_centroide, nucleo_predial,
           observaciones, perimetro, id_propietario, id_vereda
    FROM   sgs_pre_predio
    WHERE  id_predio = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapPredioRow(rows[0]) : null;
}

export async function listPropietarios(): Promise<PropietarioMini[]> {
  const rows = await sql<{ id_propietario: number | string; nombre_razon_social: string }[]>`
    SELECT id_propietario, nombre_razon_social
    FROM   sgs_pre_propietario
    ORDER  BY nombre_razon_social;
  `;
  return rows.map((r) => ({
    idPropietario: pgInt(r.id_propietario),
    nombreRazonSocial: pgText(r.nombre_razon_social),
  }));
}

export async function listVeredas(): Promise<VeredaMini[]> {
  const rows = await sql<{
    id_vereda: number | string;
    nombre_vereda: string;
    id_municipio: number | string;
    nombre_municipio: string;
  }[]>`
    SELECT v.id_vereda, v.nombre_vereda, v.id_municipio, m.nombre_municipio
    FROM   bcs_lpa_vereda v
    JOIN   bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
    ORDER  BY m.nombre_municipio, v.nombre_vereda;
  `;
  return rows.map((r) => ({
    idVereda: pgInt(r.id_vereda),
    nombreVereda: pgText(r.nombre_vereda),
    idMunicipio: pgInt(r.id_municipio),
    nombreMunicipio: pgText(r.nombre_municipio),
  }));
}

export async function crearPredio(input: Omit<PredioFull, "idPredio">): Promise<PredioFull> {
  const rows = await sql<{ id_predio: number | string }[]>`
    INSERT INTO sgs_pre_predio (
      nombre_predio, area_ha, cedula_catastral, cedula_ant,
      longitud_centroide, latitud_centroide, nucleo_predial,
      observaciones, perimetro, id_propietario, id_vereda
    ) VALUES (
      ${input.nombrePredio}, ${input.areaHa}, ${input.cedulaCatastral}, ${input.cedulaAnt},
      ${input.longitudCentroide}, ${input.latitudCentroide}, ${input.nucleoPredial},
      ${input.observaciones}, ${input.perimetro}, ${input.idPropietario}, ${input.idVereda}
    )
    RETURNING id_predio;
  `;
  if (!rows[0]) throw new Error("Insert fallido");
  const fresh = await getPredioById(pgInt(rows[0].id_predio));
  if (!fresh) throw new Error("Insert OK pero no se puede releer");
  return fresh;
}

export async function actualizarPredio(
  id: number,
  input: Omit<PredioFull, "idPredio">,
): Promise<void> {
  await sql`
    UPDATE sgs_pre_predio SET
      nombre_predio       = ${input.nombrePredio},
      area_ha             = ${input.areaHa},
      cedula_catastral    = ${input.cedulaCatastral},
      cedula_ant          = ${input.cedulaAnt},
      longitud_centroide  = ${input.longitudCentroide},
      latitud_centroide   = ${input.latitudCentroide},
      nucleo_predial      = ${input.nucleoPredial},
      observaciones       = ${input.observaciones},
      perimetro           = ${input.perimetro},
      id_propietario      = ${input.idPropietario},
      id_vereda           = ${input.idVereda}
    WHERE id_predio = ${id};
  `;
}

export async function eliminarPredio(id: number): Promise<void> {
  // Verificamos que no tenga propuestas asociadas (FK logic está en BD,
  // pero queremos un mensaje útil antes del 23503).
  const propuestas = await sql<{ count: number | string }[]>`
    SELECT COUNT(*)::int AS count
    FROM   sgs_pro_propuesta
    WHERE  id_predio = ${id};
  `;
  const count = pgInt(propuestas[0]?.count);
  if (count > 0) {
    throw new Error(
      `No se puede eliminar: el predio tiene ${count} propuesta(s) asociada(s). ` +
      `Desvinculá las propuestas o agregá una columna "activo" (TODO).`,
    );
  }
  await sql`DELETE FROM sgs_pre_predio WHERE id_predio = ${id};`;
}

// =============================================================================
// HU-TC-08: Propietarios (sgs_pre_propietario) — CRUD
// =============================================================================

type PropietarioRow = {
  id_propietario: number | string;
  nombre_razon_social: string;
  telefono: string;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  total_predios: number | string;
};

function mapPropietarioRow(r: PropietarioRow): PropietarioFull {
  return {
    idPropietario: pgInt(r.id_propietario),
    nombreRazonSocial: pgText(r.nombre_razon_social),
    telefono: pgText(r.telefono),
    createdAt: pgDate(r.created_at),
    updatedAt: pgDate(r.updated_at),
    totalPredios: pgInt(r.total_predios),
  };
}

export async function listPropietariosFull(): Promise<PropietarioFull[]> {
  return withFallback("propietariosFull", async () => {
    const rows = await sql<PropietarioRow[]>`
      SELECT
        p.id_propietario,
        p.nombre_razon_social,
        p.telefono,
        p.created_at,
        p.updated_at,
        COALESCE(pr.cnt, 0)::int AS total_predios
      FROM   sgs_pre_propietario p
      LEFT JOIN (
        SELECT id_propietario, COUNT(*) AS cnt
        FROM   sgs_pre_predio
        GROUP  BY id_propietario
      ) pr ON pr.id_propietario = p.id_propietario
      ORDER  BY p.nombre_razon_social;
    `;
    return rows.map(mapPropietarioRow);
  }, []);
}

export async function getPropietarioById(id: number): Promise<PropietarioFull | null> {
  const rows = await sql<PropietarioRow[]>`
    SELECT
      p.id_propietario,
      p.nombre_razon_social,
      p.telefono,
      p.created_at,
      p.updated_at,
      COALESCE(pr.cnt, 0)::int AS total_predios
    FROM   sgs_pre_propietario p
    LEFT JOIN (
      SELECT id_propietario, COUNT(*) AS cnt
      FROM   sgs_pre_predio
      GROUP  BY id_propietario
    ) pr ON pr.id_propietario = p.id_propietario
    WHERE  p.id_propietario = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapPropietarioRow(rows[0]) : null;
}

export async function crearPropietario(input: PropietarioInput): Promise<PropietarioFull> {
  if (input.nombreRazonSocial.length < 2 || input.nombreRazonSocial.length > 255) {
    throw new Error("nombreRazonSocial debe tener entre 2 y 255 caracteres");
  }
  if (input.telefono !== undefined && input.telefono.length > 0 && !isValidTelefono(input.telefono)) {
    throw new Error("telefono invalido (7-20 chars, permite digitos, espacios, guiones, + y ())");
  }
  const telefono = input.telefono ?? "";
  const rows = await sql<{ id_propietario: number | string }[]>`
    INSERT INTO sgs_pre_propietario (nombre_razon_social, telefono)
    VALUES (${input.nombreRazonSocial}, ${telefono})
    ON CONFLICT (nombre_razon_social) DO UPDATE
      SET telefono = EXCLUDED.telefono
    RETURNING id_propietario;
  `;
  if (!rows[0]) throw new Error("Insert/upsert de propietario fallido");
  const fresh = await getPropietarioById(pgInt(rows[0].id_propietario));
  if (!fresh) throw new Error("Propietario no se puede releer tras upsert");
  return fresh;
}

export async function actualizarPropietario(
  id: number,
  input: PropietarioInput,
): Promise<void> {
  if (input.nombreRazonSocial.length < 2 || input.nombreRazonSocial.length > 255) {
    throw new Error("nombreRazonSocial debe tener entre 2 y 255 caracteres");
  }
  if (input.telefono !== undefined && input.telefono.length > 0 && !isValidTelefono(input.telefono)) {
    throw new Error("telefono invalido (7-20 chars, permite digitos, espacios, guiones, + y ())");
  }
  const telefono = input.telefono ?? "";
  await sql`
    UPDATE sgs_pre_propietario
    SET    nombre_razon_social = ${input.nombreRazonSocial},
           telefono            = ${telefono}
    WHERE  id_propietario = ${id};
  `;
}

export async function eliminarPropietario(id: number): Promise<void> {
  const check = await sql<{ predios: number | string }[]>`
    SELECT COUNT(*)::int AS predios
    FROM   sgs_pre_predio
    WHERE  id_propietario = ${id};
  `;
  const predios = pgInt(check[0]?.predios);
  if (predios > 0) {
    throw new Error(
      `No se puede eliminar: hay ${predios} predio(s) asociado(s) a este propietario. ` +
      `Reasignalos a otro propietario primero.`,
    );
  }
  await sql`DELETE FROM sgs_pre_propietario WHERE id_propietario = ${id};`;
}

// =============================================================================
// HU-TC-07: Veredas (bcs_lpa_vereda) — CRUD
// =============================================================================

type VeredaRow = {
  id_vereda: number | string;
  nombre_vereda: string;
  codigo_administrativo: string;
  poblacion_estimada: number | string;
  id_municipio: number | string;
  nombre_municipio: string | null;
  departamento: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  total_predios: number | string;
};

function mapVeredaRow(r: VeredaRow): VeredaFull {
  return {
    idVereda: pgInt(r.id_vereda),
    nombreVereda: pgText(r.nombre_vereda),
    codigoAdministrativo: pgText(r.codigo_administrativo),
    poblacionEstimada: pgInt(r.poblacion_estimada),
    idMunicipio: pgInt(r.id_municipio),
    nombreMunicipio: r.nombre_municipio ?? null,
    departamento: r.departamento ?? null,
    createdAt: pgDate(r.created_at),
    updatedAt: pgDate(r.updated_at),
    totalPredios: pgInt(r.total_predios),
  };
}

export async function listVeredasFull(): Promise<VeredaFull[]> {
  return withFallback("veredasFull", async () => {
    const rows = await sql<VeredaRow[]>`
      SELECT
        v.id_vereda,
        v.nombre_vereda,
        v.codigo_administrativo,
        v.poblacion_estimada,
        v.id_municipio,
        m.nombre_municipio,
        m.departamento,
        v.created_at,
        v.updated_at,
        COALESCE(p.cnt, 0)::int AS total_predios
      FROM   bcs_lpa_vereda     v
      JOIN   bcs_lpa_municipio  m ON m.id_municipio = v.id_municipio
      LEFT JOIN (
        SELECT id_vereda, COUNT(*) AS cnt
        FROM   sgs_pre_predio
        GROUP  BY id_vereda
      ) p ON p.id_vereda = v.id_vereda
      ORDER  BY m.nombre_municipio, v.nombre_vereda;
    `;
    return rows.map(mapVeredaRow);
  }, []);
}

export async function getVeredaById(id: number): Promise<VeredaFull | null> {
  const rows = await sql<VeredaRow[]>`
    SELECT
      v.id_vereda,
      v.nombre_vereda,
      v.codigo_administrativo,
      v.poblacion_estimada,
      v.id_municipio,
      m.nombre_municipio,
      m.departamento,
      v.created_at,
      v.updated_at,
      COALESCE(p.cnt, 0)::int AS total_predios
    FROM   bcs_lpa_vereda     v
    JOIN   bcs_lpa_municipio  m ON m.id_municipio = v.id_municipio
    LEFT JOIN (
      SELECT id_vereda, COUNT(*) AS cnt
      FROM   sgs_pre_predio
      GROUP  BY id_vereda
    ) p ON p.id_vereda = v.id_vereda
    WHERE  v.id_vereda = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapVeredaRow(rows[0]) : null;
}

export async function crearVereda(input: VeredaInput): Promise<VeredaFull> {
  if (input.nombreVereda.length < 2 || input.nombreVereda.length > 255) {
    throw new Error("nombreVereda debe tener entre 2 y 255 caracteres");
  }
  if (input.codigoAdministrativo.length < 1 || input.codigoAdministrativo.length > 50) {
    throw new Error("codigoAdministrativo debe tener entre 1 y 50 caracteres");
  }
  if (input.poblacionEstimada !== undefined && input.poblacionEstimada < 0) {
    throw new Error("poblacionEstimada debe ser >= 0");
  }
  const rows = await sql<{ id_vereda: number | string }[]>`
    INSERT INTO bcs_lpa_vereda (nombre_vereda, codigo_administrativo, poblacion_estimada, id_municipio)
    VALUES (
      ${input.nombreVereda},
      ${input.codigoAdministrativo},
      ${input.poblacionEstimada ?? 0},
      ${input.idMunicipio}
    )
    ON CONFLICT (id_municipio, nombre_vereda) DO UPDATE
      SET codigo_administrativo = EXCLUDED.codigo_administrativo
    RETURNING id_vereda;
  `;
  if (!rows[0]) throw new Error("Insert/upsert de vereda fallido");
  const fresh = await getVeredaById(pgInt(rows[0].id_vereda));
  if (!fresh) throw new Error("Vereda no se puede releer tras upsert");
  return fresh;
}

export async function actualizarVereda(
  id: number,
  input: VeredaInput,
): Promise<void> {
  if (input.nombreVereda.length < 2 || input.nombreVereda.length > 255) {
    throw new Error("nombreVereda debe tener entre 2 y 255 caracteres");
  }
  if (input.codigoAdministrativo.length < 1 || input.codigoAdministrativo.length > 50) {
    throw new Error("codigoAdministrativo debe tener entre 1 y 50 caracteres");
  }
  if (input.poblacionEstimada !== undefined && input.poblacionEstimada < 0) {
    throw new Error("poblacionEstimada debe ser >= 0");
  }
  await sql`
    UPDATE bcs_lpa_vereda
    SET    nombre_vereda          = ${input.nombreVereda},
           codigo_administrativo  = ${input.codigoAdministrativo},
           poblacion_estimada     = ${input.poblacionEstimada ?? 0},
           id_municipio           = ${input.idMunicipio}
    WHERE  id_vereda = ${id};
  `;
}

export async function eliminarVereda(id: number): Promise<void> {
  const check = await sql<{ predios: number | string }[]>`
    SELECT COUNT(*)::int AS predios
    FROM   sgs_pre_predio
    WHERE  id_vereda = ${id};
  `;
  const predios = pgInt(check[0]?.predios);
  if (predios > 0) {
    throw new Error(
      `No se puede eliminar: hay ${predios} predio(s) en esta vereda. ` +
      `Reasignalos a otra vereda primero.`,
    );
  }
  await sql`DELETE FROM bcs_lpa_vereda WHERE id_vereda = ${id};`;
}
