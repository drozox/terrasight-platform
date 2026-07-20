// =============================================================================
// Auth plataforma — usuarios y roles (HU-AD-02)
//
// CRUD de usuarios administradores de la plataforma. NO toca `lib/auth.ts`
// (que es NextAuth v5) — solo opera sobre la tabla `sgs_adm_usuario`.
//
// Reglas del split:
//   - Solo importa de `./_helpers`, `./types`, `../db`. Nunca de otro
//     `repos/*.ts`.
//   - `bcryptjs` viene de `../db`-es-dependency o como dependencia de runtime.
//     Como `db.ts` no lo exporta, lo importamos directamente.
// =============================================================================

import bcrypt from "bcryptjs";
import { sql, pgInt, pgText } from "../db";
import type { RolSistema } from "../auth";
import type { UsuarioAdmin } from "../types";

// -----------------------------------------------------------------------------
// Row type + mapper interno compartido por todas las queries que devuelven
// `UsuarioAdmin`. Mantener la firma sincronizada con el SELECT.
// -----------------------------------------------------------------------------
type UsuarioRowRaw = {
  id_usuario: number | string;
  email: string;
  nombre: string;
  rol: RolSistema;
  activo: boolean | string;
  ultimo_acceso_en: Date | string | null;
  creado_en: Date | string;
};

function mapUsuarioRow(r: UsuarioRowRaw): UsuarioAdmin {
  return {
    idUsuario: pgInt(r.id_usuario),
    email: pgText(r.email),
    nombre: pgText(r.nombre),
    rol: r.rol,
    activo: r.activo === true || r.activo === "t" || r.activo === "true",
    ultimoAccesoEn: r.ultimo_acceso_en ? new Date(pgText(r.ultimo_acceso_en)) : null,
    creadoEn: new Date(pgText(r.creado_en)),
  };
}

export async function listRoles(): Promise<RolSistema[]> {
  const rows = await sql<{ nombre: RolSistema }[]>`SELECT nombre FROM sgs_adm_rol ORDER BY id_rol;`;
  return rows.map((r) => r.nombre);
}

export async function listUsuarios(): Promise<UsuarioAdmin[]> {
  const rows = await sql<UsuarioRowRaw[]>`
    SELECT u.id_usuario, u.email, u.nombre, r.nombre AS rol, u.activo,
           u.ultimo_acceso_en, u.creado_en
    FROM   sgs_adm_usuario u
    JOIN   sgs_adm_rol      r ON r.id_rol = u.id_rol
    ORDER  BY u.creado_en DESC, u.id_usuario DESC;
  `;
  return rows.map(mapUsuarioRow);
}

export async function getUsuarioById(id: number): Promise<UsuarioAdmin | null> {
  const rows = await sql<UsuarioRowRaw[]>`
    SELECT u.id_usuario, u.email, u.nombre, r.nombre AS rol, u.activo,
           u.ultimo_acceso_en, u.creado_en
    FROM   sgs_adm_usuario u
    JOIN   sgs_adm_rol      r ON r.id_rol = u.id_rol
    WHERE  u.id_usuario = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapUsuarioRow(rows[0]) : null;
}

export async function findUsuarioByEmail(email: string): Promise<UsuarioAdmin | null> {
  const rows = await sql<UsuarioRowRaw[]>`
    SELECT u.id_usuario, u.email, u.nombre, r.nombre AS rol, u.activo,
           u.ultimo_acceso_en, u.creado_en
    FROM   sgs_adm_usuario u
    JOIN   sgs_adm_rol      r ON r.id_rol = u.id_rol
    WHERE  lower(u.email) = lower(${email})
    LIMIT  1;
  `;
  return rows[0] ? mapUsuarioRow(rows[0]) : null;
}

export async function crearUsuario(args: {
  email: string;
  nombre: string;
  password: string;
  rol: RolSistema;
}): Promise<UsuarioAdmin> {
  const passwordHash = await bcrypt.hash(args.password, 10);
  const rows = await sql<{ id_usuario: number | string }[]>`
    INSERT INTO sgs_adm_usuario (email, password_hash, nombre, id_rol)
    SELECT ${args.email.toLowerCase()}, ${passwordHash}, ${args.nombre}, r.id_rol
    FROM   sgs_adm_rol r
    WHERE  r.nombre = ${args.rol}
    RETURNING id_usuario;
  `;
  if (!rows[0]) {
    throw new Error(`Rol ${args.rol} no existe en sgs_adm_rol`);
  }
  const fresh = await getUsuarioById(pgInt(rows[0].id_usuario));
  if (!fresh) throw new Error("Usuario creado pero no encontrado al releer");
  return fresh;
}

export async function actualizarUsuario(args: {
  idUsuario: number;
  nombre: string;
  rol: RolSistema;
  activo: boolean;
}): Promise<void> {
  await sql`
    UPDATE sgs_adm_usuario u
    SET    nombre        = ${args.nombre},
           id_rol        = (SELECT id_rol FROM sgs_adm_rol WHERE nombre = ${args.rol}),
           activo        = ${args.activo},
           actualizado_en = now()
    WHERE  u.id_usuario  = ${args.idUsuario};
  `;
}

export async function resetPasswordUsuario(args: {
  idUsuario: number;
  password: string;
}): Promise<void> {
  const passwordHash = await bcrypt.hash(args.password, 10);
  await sql`
    UPDATE sgs_adm_usuario
    SET    password_hash = ${passwordHash},
           actualizado_en = now()
    WHERE  id_usuario    = ${args.idUsuario};
  `;
}

export async function setUsuarioActivo(args: {
  idUsuario: number;
  activo: boolean;
}): Promise<void> {
  await sql`
    UPDATE sgs_adm_usuario
    SET    activo        = ${args.activo},
           actualizado_en = now()
    WHERE  id_usuario    = ${args.idUsuario};
  `;
}
