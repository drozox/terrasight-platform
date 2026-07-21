// =============================================================================
// Catálogos (HU-TC-03)
//
//   - listComponentesLookup / listAccionesLookup: para <select> de formularios
//   - listComponentesFull / listAccionesFull: para el panel admin con contadores
//   - CRUD de componentes y acciones con whitelist + UNIQUE amable
//
// Reglas del split:
//   - Solo importa de `./_helpers`, `./types`, `./constants`, `../db`.
//   - `COMPONENTES_VALIDOS` y `ACCIONES_VALIDAS` viven en `lib/constants.ts`
//     (client-safe). El servidor los reusa para validación de whitelist.
// =============================================================================

import { sql, pgInt, pgText, pgDate } from "../db";
import { COMPONENTES_VALIDOS, ACCIONES_VALIDAS } from "../constants";
import { cached } from "./_cache";
import type {
  ComponenteLookup,
  AccionLookup,
  ComponenteFull,
  ComponenteValido,
  AccionFull,
  AccionValida,
} from "../types";

// =============================================================================
// Lookup: Componentes y Acciones (TC-03 catálogo, lectura)
// =============================================================================

export async function listComponentesLookup(): Promise<ComponenteLookup[]> {
  const rows = await sql<{ id_componente: number | string; nombre: string }[]>`
    SELECT id_componente, nombre FROM sgs_com_componente ORDER BY nombre;
  `;
  return rows.map((r) => ({
    idComponente: pgInt(r.id_componente),
    nombre: pgText(r.nombre),
  }));
}

export async function listAccionesLookup(): Promise<AccionLookup[]> {
  const rows = await sql<{
    id_accion: number | string; nombre: string;
    id_componente: number | string; nombre_componente: string;
  }[]>`
    SELECT a.id_accion, a.nombre, a.id_componente, c.nombre AS nombre_componente
    FROM   sgs_com_accion a
    JOIN   sgs_com_componente c ON c.id_componente = a.id_componente
    ORDER  BY c.nombre, a.nombre;
  `;
  return rows.map((r) => ({
    idAccion: pgInt(r.id_accion),
    nombre: pgText(r.nombre),
    idComponente: pgInt(r.id_componente),
    nombreComponente: pgText(r.nombre_componente),
  }));
}

// =============================================================================
// CRUD de catalogos (HU-TC-03)
//
// sgs_com_componente y sgs_com_accion son catalogos cerrados del modelo BDG.
// Para evitar updates accidentales, las Server Actions validan los nombres
// contra una whitelist (`COMPONENTES_VALIDOS` / `ACCIONES_VALIDAS`) antes de
// pegarle a la BD. Los CHECK constraints de la BD son la red de seguridad
// final. Las UNIQUE constraints nuevas habilitan ON CONFLICT para devolver
// el registro existente en vez de error 23505 al usuario.
// =============================================================================

// -----------------------------------------------------------------------------
// Listado de componentes con contadores (acciones y propuestas vinculadas).
// Usado por /catalogos (server) y por la UI para mostrar dependencias antes
// de borrar.
// -----------------------------------------------------------------------------
const listComponentesFullImpl = async (): Promise<ComponenteFull[]> => {
  const rows = await sql<{
    id_componente: number | string;
    nombre: string;
    created_at: string | Date | null;
    updated_at: string | Date | null;
    total_acciones: number | string;
    total_propuestas: number | string;
  }[]>`
    SELECT
      c.id_componente,
      c.nombre,
      c.created_at,
      c.updated_at,
      COALESCE(a.cnt, 0)::int AS total_acciones,
      COALESCE(p.cnt, 0)::int AS total_propuestas
    FROM sgs_com_componente c
    LEFT JOIN (
      SELECT id_componente, COUNT(*) AS cnt
      FROM sgs_com_accion
      GROUP BY id_componente
    ) a ON a.id_componente = c.id_componente
    LEFT JOIN (
      SELECT c2.id_componente, COUNT(*) AS cnt
      FROM sgs_pro_propuesta pp
      JOIN sgs_com_accion a2        ON a2.id_accion       = pp.id_accion
      JOIN sgs_com_componente c2    ON c2.id_componente  = a2.id_componente
      GROUP BY c2.id_componente
    ) p ON p.id_componente = c.id_componente
    ORDER BY c.nombre;
  `;
  return rows.map((r) => ({
    idComponente: pgInt(r.id_componente),
    nombre: pgText(r.nombre) as ComponenteValido,
    createdAt: pgDate(r.created_at),
    updatedAt: pgDate(r.updated_at),
    totalAcciones: pgInt(r.total_acciones),
    totalPropuestas: pgInt(r.total_propuestas),
  }));
};
export const listComponentesFull = cached(listComponentesFullImpl, {
  tags: ["catalogos:full"],
  ttl: 300,
});

// -----------------------------------------------------------------------------
// Listado de acciones con contador de propuestas. JOIN a componente para
// mostrar nombre legible en la UI.
// -----------------------------------------------------------------------------
const listAccionesFullImpl = async (): Promise<AccionFull[]> => {
  const rows = await sql<{
    id_accion: number | string;
    nombre: string;
    id_componente: number | string;
    nombre_componente: string;
    created_at: string | Date | null;
    updated_at: string | Date | null;
    total_propuestas: number | string;
  }[]>`
    SELECT
      a.id_accion,
      a.nombre,
      a.id_componente,
      c.nombre AS nombre_componente,
      a.created_at,
      a.updated_at,
      COALESCE(p.cnt, 0)::int AS total_propuestas
    FROM sgs_com_accion a
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    LEFT JOIN (
      SELECT id_accion, COUNT(*) AS cnt
      FROM sgs_pro_propuesta
      GROUP BY id_accion
    ) p ON p.id_accion = a.id_accion
    ORDER BY c.nombre, a.nombre;
  `;
  return rows.map((r) => ({
    idAccion: pgInt(r.id_accion),
    nombre: pgText(r.nombre) as AccionValida,
    idComponente: pgInt(r.id_componente),
    nombreComponente: pgText(r.nombre_componente) as ComponenteValido,
    createdAt: pgDate(r.created_at),
    updatedAt: pgDate(r.updated_at),
    totalPropuestas: pgInt(r.total_propuestas),
  }));
};
export const listAccionesFull = cached(listAccionesFullImpl, {
  tags: ["catalogos:full"],
  ttl: 300,
});

// -----------------------------------------------------------------------------
// Helpers byId (para futuro /catalogos/[id] si lo piden; hoy la pagina es
// una sola vista con dos tablas). Mantenerlos exported por consistencia.
// -----------------------------------------------------------------------------
export async function getComponenteById(id: number): Promise<ComponenteFull | null> {
  const all = await listComponentesFull();
  return all.find((c) => c.idComponente === id) ?? null;
}

export async function getAccionById(id: number): Promise<AccionFull | null> {
  const all = await listAccionesFull();
  return all.find((a) => a.idAccion === id) ?? null;
}

// -----------------------------------------------------------------------------
// Crear componente.
// Si el nombre ya existe (UNIQUE), devolvemos el registro existente en vez
// de tirar 23505 — UX mas amable para el cliente.
// -----------------------------------------------------------------------------
export async function crearComponente(nombre: ComponenteValido): Promise<ComponenteFull> {
  if (!(COMPONENTES_VALIDOS as readonly string[]).includes(nombre)) {
    throw new Error(`Componente inválido: ${nombre}`);
  }
  const rows = await sql<{ id_componente: number | string }[]>`
    INSERT INTO sgs_com_componente (nombre)
    VALUES (${nombre})
    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
    RETURNING id_componente;
  `;
  if (!rows[0]) throw new Error("Insert/upsert de componente fallido");
  const fresh = await getComponenteById(pgInt(rows[0].id_componente));
  if (!fresh) throw new Error("Componente no se puede releer tras upsert");
  return fresh;
}

// -----------------------------------------------------------------------------
// Actualizar componente. Valida whitelist en la app; UNIQUE constraint es la
// red de seguridad. Si el nuevo nombre ya existe en otra fila, 23505.
// -----------------------------------------------------------------------------
export async function actualizarComponente(
  id: number,
  nombre: ComponenteValido,
): Promise<void> {
  if (!(COMPONENTES_VALIDOS as readonly string[]).includes(nombre)) {
    throw new Error(`Componente inválido: ${nombre}`);
  }
  await sql`
    UPDATE sgs_com_componente
    SET    nombre = ${nombre}
    WHERE  id_componente = ${id};
  `;
}

// -----------------------------------------------------------------------------
// Eliminar componente. Bloqueado si tiene acciones o propuestas vinculadas.
// Devuelve un mensaje claro para la UI.
// -----------------------------------------------------------------------------
export async function eliminarComponente(id: number): Promise<void> {
  const check = await sql<{ acciones: number | string; propuestas: number | string }[]>`
    SELECT
      (SELECT COUNT(*) FROM sgs_com_accion     WHERE id_componente = ${id})::int AS acciones,
      (SELECT COUNT(*) FROM sgs_com_accion a
         JOIN sgs_pro_propuesta p ON p.id_accion = a.id_accion
         WHERE a.id_componente = ${id})::int  AS propuestas;
  `;
  const acciones = pgInt(check[0]?.acciones);
  const propuestas = pgInt(check[0]?.propuestas);
  if (acciones > 0) {
    throw new Error(
      `No se puede eliminar: el componente tiene ${acciones} accion(es) asociada(s). ` +
      `Eliminá primero las acciones o reasignalas.`,
    );
  }
  if (propuestas > 0) {
    throw new Error(
      `No se puede eliminar: hay ${propuestas} propuesta(s) que referencian acciones de este componente.`,
    );
  }
  await sql`DELETE FROM sgs_com_componente WHERE id_componente = ${id};`;
}

// -----------------------------------------------------------------------------
// Crear accion. ON CONFLICT (id_componente, nombre) devuelve la fila existente.
// -----------------------------------------------------------------------------
export async function crearAccion(
  nombre: AccionValida,
  idComponente: number,
): Promise<AccionFull> {
  if (!(ACCIONES_VALIDAS as readonly string[]).includes(nombre)) {
    throw new Error(`Acción inválida: ${nombre}`);
  }
  const rows = await sql<{ id_accion: number | string }[]>`
    INSERT INTO sgs_com_accion (nombre, id_componente)
    VALUES (${nombre}, ${idComponente})
    ON CONFLICT (id_componente, nombre)
      DO UPDATE SET id_componente = EXCLUDED.id_componente
    RETURNING id_accion;
  `;
  if (!rows[0]) throw new Error("Insert/upsert de accion fallido");
  const fresh = await getAccionById(pgInt(rows[0].id_accion));
  if (!fresh) throw new Error("Accion no se puede releer tras upsert");
  return fresh;
}

// -----------------------------------------------------------------------------
// Actualizar accion. Cambiar el componente esta permitido (rebind).
// -----------------------------------------------------------------------------
export async function actualizarAccion(
  id: number,
  nombre: AccionValida,
  idComponente: number,
): Promise<void> {
  if (!(ACCIONES_VALIDAS as readonly string[]).includes(nombre)) {
    throw new Error(`Acción inválida: ${nombre}`);
  }
  await sql`
    UPDATE sgs_com_accion
    SET    nombre = ${nombre},
           id_componente = ${idComponente}
    WHERE  id_accion = ${id};
  `;
}

// -----------------------------------------------------------------------------
// Eliminar accion. Bloqueado si hay propuestas que la referencian (FK RESTRICT
// lo haria igual, pero el mensaje proactivo es mas claro).
// -----------------------------------------------------------------------------
export async function eliminarAccion(id: number): Promise<void> {
  const check = await sql<{ propuestas: number | string }[]>`
    SELECT COUNT(*)::int AS propuestas
    FROM   sgs_pro_propuesta
    WHERE  id_accion = ${id};
  `;
  const propuestas = pgInt(check[0]?.propuestas);
  if (propuestas > 0) {
    throw new Error(
      `No se puede eliminar: hay ${propuestas} propuesta(s) que referencian esta accion. ` +
      `Reasignalas a otra accion primero.`,
    );
  }
  await sql`DELETE FROM sgs_com_accion WHERE id_accion = ${id};`;
}
