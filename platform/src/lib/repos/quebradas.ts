// =============================================================================
// Quebradas CRUD (HU-TC-02) + Catálogos secundarios Municipios (HU-TC-06) y
// Microcuencas (HU-TC-09).
//
// Reglas del split:
//   - Solo importa de `./_helpers`, `./types`, `../db`. Nunca de otro
//     `repos/*.ts`.
// =============================================================================

import { sql, pgInt, pgNum, pgText, pgDate } from "../db";
import { withFallback } from "./_helpers";
import { cached } from "./_cache";
import type {
  QuebradaFull,
  MunicipioMini,
  MunicipioFull,
  MunicipioInput,
  MicrocuencaFull,
  MicrocuencaInput,
} from "../types";

// =============================================================================
// Quebradas (HU-TC-02)
// =============================================================================

type QuebradaRow = {
  id_quebrada: number | string;
  nombre_quebrada: string;
  area: number | string | null;
  latitud: number | string;
  longitud: number | string;
  id_municipio: number | string | null;
  id_microcuenca: number | string | null;
};

function mapQuebradaRow(r: QuebradaRow): QuebradaFull {
  return {
    idQuebrada: pgInt(r.id_quebrada),
    nombreQuebrada: pgText(r.nombre_quebrada),
    area: r.area == null ? 0 : pgNum(r.area),
    latitud: pgNum(r.latitud),
    longitud: pgNum(r.longitud),
    idMunicipio: r.id_municipio == null ? null : pgInt(r.id_municipio),
    idMicrocuenca: r.id_microcuenca == null ? null : pgInt(r.id_microcuenca),
  };
}

export async function listQuebradasFull(): Promise<QuebradaFull[]> {
  const rows = await sql<QuebradaRow[]>`
    SELECT id_quebrada, nombre_quebrada, area, latitud, longitud,
           id_municipio, id_microcuenca
    FROM   bcs_dh_quebrada
    ORDER  BY nombre_quebrada;
  `;
  return rows.map(mapQuebradaRow);
}

export async function getQuebradaById(id: number): Promise<QuebradaFull | null> {
  const rows = await sql<QuebradaRow[]>`
    SELECT id_quebrada, nombre_quebrada, area, latitud, longitud,
           id_municipio, id_microcuenca
    FROM   bcs_dh_quebrada
    WHERE  id_quebrada = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapQuebradaRow(rows[0]) : null;
}

export async function crearQuebrada(input: Omit<QuebradaFull, "idQuebrada">): Promise<QuebradaFull> {
  const rows = await sql<{ id_quebrada: number | string }[]>`
    INSERT INTO bcs_dh_quebrada (
      nombre_quebrada, area, latitud, longitud, id_municipio, id_microcuenca
    ) VALUES (
      ${input.nombreQuebrada}, ${input.area}, ${input.latitud}, ${input.longitud},
      ${input.idMunicipio}, ${input.idMicrocuenca}
    )
    RETURNING id_quebrada;
  `;
  if (!rows[0]) throw new Error("Insert fallido");
  const fresh = await getQuebradaById(pgInt(rows[0].id_quebrada));
  if (!fresh) throw new Error("Insert OK pero no se puede releer");
  return fresh;
}

export async function actualizarQuebrada(
  id: number,
  input: Omit<QuebradaFull, "idQuebrada">,
): Promise<void> {
  await sql`
    UPDATE bcs_dh_quebrada SET
      nombre_quebrada = ${input.nombreQuebrada},
      area            = ${input.area},
      latitud         = ${input.latitud},
      longitud        = ${input.longitud},
      id_municipio    = ${input.idMunicipio},
      id_microcuenca  = ${input.idMicrocuenca}
    WHERE id_quebrada = ${id};
  `;
}

export async function eliminarQuebrada(id: number): Promise<void> {
  // Las FKs (sgs_pro_propuesta.id_quebrada) son ON DELETE RESTRICT, así que
  // un 23503 nos llega de la BD si hay dependencias. El cliente lo verá.
  await sql`DELETE FROM bcs_dh_quebrada WHERE id_quebrada = ${id};`;
}

export async function listMunicipios(): Promise<MunicipioMini[]> {
  const rows = await sql<{ id_municipio: number | string; nombre_municipio: string }[]>`
    SELECT id_municipio, nombre_municipio
    FROM   bcs_lpa_municipio
    ORDER  BY nombre_municipio;
  `;
  return rows.map((r) => ({
    idMunicipio: pgInt(r.id_municipio),
    nombreMunicipio: pgText(r.nombre_municipio),
  }));
}

// =============================================================================
// HU-TC-06: Municipios (bcs_lpa_municipio) — CRUD
// =============================================================================

type MunicipioRow = {
  id_municipio: number | string;
  nombre_municipio: string;
  codigo_administrativo: string;
  departamento: string;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  total_veredas: number | string;
  total_predios: number | string;
};

function mapMunicipioRow(r: MunicipioRow): MunicipioFull {
  return {
    idMunicipio: pgInt(r.id_municipio),
    nombreMunicipio: pgText(r.nombre_municipio),
    codigoAdministrativo: pgText(r.codigo_administrativo),
    departamento: pgText(r.departamento),
    createdAt: pgDate(r.created_at),
    updatedAt: pgDate(r.updated_at),
    totalVeredas: pgInt(r.total_veredas),
    totalPredios: pgInt(r.total_predios),
  };
}

const listMunicipiosFullImpl = async (): Promise<MunicipioFull[]> => {
  return withFallback("municipiosFull", async () => {
    const rows = await sql<MunicipioRow[]>`
      SELECT
        m.id_municipio,
        m.nombre_municipio,
        m.codigo_administrativo,
        m.departamento,
        m.created_at,
        m.updated_at,
        COALESCE(v.cnt, 0)::int AS total_veredas,
        COALESCE(p.cnt, 0)::int AS total_predios
      FROM   bcs_lpa_municipio m
      LEFT JOIN (
        SELECT id_municipio, COUNT(*) AS cnt
        FROM   bcs_lpa_vereda
        GROUP  BY id_municipio
      ) v ON v.id_municipio = m.id_municipio
      LEFT JOIN (
        SELECT v2.id_municipio, COUNT(pr.id_predio) AS cnt
        FROM   bcs_lpa_vereda  v2
        JOIN   sgs_pre_predio  pr ON pr.id_vereda = v2.id_vereda
        GROUP  BY v2.id_municipio
      ) p ON p.id_municipio = m.id_municipio
      ORDER  BY m.departamento, m.nombre_municipio;
    `;
    return rows.map(mapMunicipioRow);
  }, []);
};
export const listMunicipiosFull = cached(listMunicipiosFullImpl, {
  tags: ["catalogos:full"],
  ttl: 300,
});

export async function getMunicipioById(id: number): Promise<MunicipioFull | null> {
  const rows = await sql<MunicipioRow[]>`
    SELECT
      m.id_municipio,
      m.nombre_municipio,
      m.codigo_administrativo,
      m.departamento,
      m.created_at,
      m.updated_at,
      COALESCE(v.cnt, 0)::int AS total_veredas,
      COALESCE(p.cnt, 0)::int AS total_predios
    FROM   bcs_lpa_municipio m
    LEFT JOIN (
        SELECT id_municipio, COUNT(*) AS cnt
        FROM   bcs_lpa_vereda
        GROUP  BY id_municipio
      ) v ON v.id_municipio = m.id_municipio
      LEFT JOIN (
        SELECT v2.id_municipio, COUNT(pr.id_predio) AS cnt
        FROM   bcs_lpa_vereda  v2
        JOIN   sgs_pre_predio  pr ON pr.id_vereda = v2.id_vereda
        GROUP  BY v2.id_municipio
      ) p ON p.id_municipio = m.id_municipio
    WHERE  m.id_municipio = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapMunicipioRow(rows[0]) : null;
}

export async function crearMunicipio(input: MunicipioInput): Promise<MunicipioFull> {
  if (input.nombreMunicipio.length < 2 || input.nombreMunicipio.length > 255) {
    throw new Error("nombreMunicipio debe tener entre 2 y 255 caracteres");
  }
  if (input.codigoAdministrativo.length < 1 || input.codigoAdministrativo.length > 50) {
    throw new Error("codigoAdministrativo debe tener entre 1 y 50 caracteres");
  }
  if (input.departamento.length < 2 || input.departamento.length > 100) {
    throw new Error("departamento debe tener entre 2 y 100 caracteres");
  }
  const rows = await sql<{ id_municipio: number | string }[]>`
    INSERT INTO bcs_lpa_municipio (nombre_municipio, codigo_administrativo, departamento)
    VALUES (${input.nombreMunicipio}, ${input.codigoAdministrativo}, ${input.departamento})
    ON CONFLICT (nombre_municipio, departamento) DO UPDATE
      SET codigo_administrativo = EXCLUDED.codigo_administrativo
    RETURNING id_municipio;
  `;
  if (!rows[0]) throw new Error("Insert/upsert de municipio fallido");
  const fresh = await getMunicipioById(pgInt(rows[0].id_municipio));
  if (!fresh) throw new Error("Municipio no se puede releer tras upsert");
  return fresh;
}

export async function actualizarMunicipio(
  id: number,
  input: MunicipioInput,
): Promise<void> {
  if (input.nombreMunicipio.length < 2 || input.nombreMunicipio.length > 255) {
    throw new Error("nombreMunicipio debe tener entre 2 y 255 caracteres");
  }
  if (input.codigoAdministrativo.length < 1 || input.codigoAdministrativo.length > 50) {
    throw new Error("codigoAdministrativo debe tener entre 1 y 50 caracteres");
  }
  if (input.departamento.length < 2 || input.departamento.length > 100) {
    throw new Error("departamento debe tener entre 2 y 100 caracteres");
  }
  await sql`
    UPDATE bcs_lpa_municipio
    SET    nombre_municipio      = ${input.nombreMunicipio},
           codigo_administrativo = ${input.codigoAdministrativo},
           departamento          = ${input.departamento}
    WHERE  id_municipio = ${id};
  `;
}

export async function eliminarMunicipio(id: number): Promise<void> {
  const check = await sql<{ veredas: number | string; predios: number | string }[]>`
    SELECT
      (SELECT COUNT(*) FROM bcs_lpa_vereda WHERE id_municipio = ${id})::int    AS veredas,
      (SELECT COUNT(*) FROM sgs_pre_predio
         WHERE id_vereda IN (SELECT id_vereda FROM bcs_lpa_vereda WHERE id_municipio = ${id})
      )::int                                                                    AS predios;
  `;
  const veredas = pgInt(check[0]?.veredas);
  const predios = pgInt(check[0]?.predios);
  if (veredas > 0) {
    throw new Error(
      `No se puede eliminar: el municipio tiene ${veredas} vereda(s) asociada(s). ` +
      `Eliminá primero las veredas o reasignalas.`,
    );
  }
  if (predios > 0) {
    throw new Error(
      `No se puede eliminar: hay ${predios} predio(s) en veredas de este municipio.`,
    );
  }
  await sql`DELETE FROM bcs_lpa_municipio WHERE id_municipio = ${id};`;
}

// =============================================================================
// HU-TC-09: Microcuencas (bcs_dh_microcuenca) — CRUD
// =============================================================================

type MicrocuencaRow = {
  id_microcuenca: number | string;
  nombre_microcuenca: string;
  codigo: string;
  area: number | string;
  latitud: number | string;
  longitud: number | string;
  nombre_usuarios: string;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  total_quebradas: number | string;
};

function mapMicrocuencaRow(r: MicrocuencaRow): MicrocuencaFull {
  return {
    idMicrocuenca: pgInt(r.id_microcuenca),
    nombreMicrocuenca: pgText(r.nombre_microcuenca),
    codigo: pgText(r.codigo),
    area: pgNum(r.area),
    latitud: pgNum(r.latitud),
    longitud: pgNum(r.longitud),
    nombreUsuarios: pgText(r.nombre_usuarios),
    createdAt: pgDate(r.created_at),
    updatedAt: pgDate(r.updated_at),
    totalQuebradas: pgInt(r.total_quebradas),
  };
}

const listMicrocuencasFullImpl = async (): Promise<MicrocuencaFull[]> => {
  return withFallback("microcuencasFull", async () => {
    const rows = await sql<MicrocuencaRow[]>`
      SELECT
        mc.id_microcuenca,
        mc.nombre_microcuenca,
        mc.codigo,
        mc.area,
        mc.latitud,
        mc.longitud,
        mc.nombre_usuarios,
        mc.created_at,
        mc.updated_at,
        COALESCE(q.cnt, 0)::int AS total_quebradas
      FROM   bcs_dh_microcuenca mc
      LEFT JOIN (
        SELECT id_microcuenca, COUNT(*) AS cnt
        FROM   bcs_dh_quebrada
        GROUP  BY id_microcuenca
      ) q ON q.id_microcuenca = mc.id_microcuenca
      ORDER  BY mc.nombre_microcuenca;
    `;
    return rows.map(mapMicrocuencaRow);
  }, []);
};
export const listMicrocuencasFull = cached(listMicrocuencasFullImpl, {
  tags: ["catalogos:full"],
  ttl: 300,
});

export async function getMicrocuencaById(id: number): Promise<MicrocuencaFull | null> {
  const rows = await sql<MicrocuencaRow[]>`
    SELECT
      mc.id_microcuenca,
      mc.nombre_microcuenca,
      mc.codigo,
      mc.area,
      mc.latitud,
      mc.longitud,
      mc.nombre_usuarios,
      mc.created_at,
      mc.updated_at,
      COALESCE(q.cnt, 0)::int AS total_quebradas
    FROM   bcs_dh_microcuenca mc
    LEFT JOIN (
        SELECT id_microcuenca, COUNT(*) AS cnt
        FROM   bcs_dh_quebrada
        GROUP  BY id_microcuenca
      ) q ON q.id_microcuenca = mc.id_microcuenca
    WHERE  mc.id_microcuenca = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapMicrocuencaRow(rows[0]) : null;
}

export async function crearMicrocuenca(input: MicrocuencaInput): Promise<MicrocuencaFull> {
  if (input.nombreMicrocuenca.length < 2 || input.nombreMicrocuenca.length > 255) {
    throw new Error("nombreMicrocuenca debe tener entre 2 y 255 caracteres");
  }
  if (input.codigo.length < 1 || input.codigo.length > 50) {
    throw new Error("codigo debe tener entre 1 y 50 caracteres");
  }
  const rows = await sql<{ id_microcuenca: number | string }[]>`
    INSERT INTO bcs_dh_microcuenca (nombre_microcuenca, codigo, area, latitud, longitud, nombre_usuarios)
    VALUES (
      ${input.nombreMicrocuenca},
      ${input.codigo},
      ${input.area ?? 0},
      ${input.latitud ?? 0},
      ${input.longitud ?? 0},
      ${input.nombreUsuarios ?? "N/A"}
    )
    ON CONFLICT (codigo) DO UPDATE
      SET nombre_microcuenca = EXCLUDED.nombre_microcuenca
    RETURNING id_microcuenca;
  `;
  if (!rows[0]) throw new Error("Insert/upsert de microcuenca fallido");
  const fresh = await getMicrocuencaById(pgInt(rows[0].id_microcuenca));
  if (!fresh) throw new Error("Microcuenca no se puede releer tras upsert");
  return fresh;
}

export async function actualizarMicrocuenca(
  id: number,
  input: MicrocuencaInput,
): Promise<void> {
  if (input.nombreMicrocuenca.length < 2 || input.nombreMicrocuenca.length > 255) {
    throw new Error("nombreMicrocuenca debe tener entre 2 y 255 caracteres");
  }
  if (input.codigo.length < 1 || input.codigo.length > 50) {
    throw new Error("codigo debe tener entre 1 y 50 caracteres");
  }
  await sql`
    UPDATE bcs_dh_microcuenca
    SET    nombre_microcuenca  = ${input.nombreMicrocuenca},
           codigo              = ${input.codigo},
           area                = ${input.area ?? 0},
           latitud             = ${input.latitud ?? 0},
           longitud            = ${input.longitud ?? 0},
           nombre_usuarios     = ${input.nombreUsuarios ?? "N/A"}
    WHERE  id_microcuenca = ${id};
  `;
}

export async function eliminarMicrocuenca(id: number): Promise<void> {
  const check = await sql<{ quebradas: number | string }[]>`
    SELECT COUNT(*)::int AS quebradas
    FROM   bcs_dh_quebrada
    WHERE  id_microcuenca = ${id};
  `;
  const quebradas = pgInt(check[0]?.quebradas);
  if (quebradas > 0) {
    throw new Error(
      `No se puede eliminar: hay ${quebradas} quebrada(s) asociada(s) a esta microcuenca. ` +
      `Reasignalas a otra microcuenca primero.`,
    );
  }
  await sql`DELETE FROM bcs_dh_microcuenca WHERE id_microcuenca = ${id};`;
}
