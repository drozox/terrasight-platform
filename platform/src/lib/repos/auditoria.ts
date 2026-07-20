// =============================================================================
// Auditoría — vista admin (HU-AD-04)
//
// Reglas del split:
//   - Solo importa de `./_helpers`, `./types`, `../db`. Nunca de otro
//     `repos/*.ts`.
// =============================================================================

import { sql, pgInt, pgText } from "../db";
import type { AuditEvento, AuditEvent, AuditFiltros } from "../types";

// -----------------------------------------------------------------------------
// Row type + mapper interno
// -----------------------------------------------------------------------------
type AuditRowRaw = {
  id_evento: string | number;
  ocurrido_en: Date | string;
  id_usuario: number | string | null;
  email_usado: string | null;
  evento: AuditEvento;
  recurso: string | null;
  ip: string | null;
  user_agent: string | null;
  exitoso: boolean | string;
  detalle: string | null;
  nombre_usuario: string | null;
};

function mapAuditRow(r: AuditRowRaw): AuditEvent {
  return {
    idEvento: pgText(r.id_evento),
    ocurridoEn: new Date(pgText(r.ocurrido_en)),
    idUsuario: r.id_usuario == null ? null : pgInt(r.id_usuario),
    emailUsado: r.email_usado ? pgText(r.email_usado) : null,
    evento: r.evento,
    recurso: r.recurso,
    ip: r.ip,
    userAgent: r.user_agent,
    exitoso: r.exitoso === true || r.exitoso === "t" || r.exitoso === "true",
    detalle: r.detalle,
    nombreUsuario: r.nombre_usuario,
  };
}

export async function listAuditEventos(
  filtros: AuditFiltros = {},
): Promise<{ rows: AuditEvent[]; total: number }> {
  const limit = Math.min(filtros.limit ?? 50, 200);
  const offset = filtros.offset ?? 0;

  const whereParts: ReturnType<typeof sql>[] = [];
  if (filtros.evento) whereParts.push(sql`a.evento = ${filtros.evento}`);
  if (filtros.idUsuario != null) whereParts.push(sql`a.id_usuario = ${filtros.idUsuario}`);
  if (filtros.emailLike) whereParts.push(sql`a.email_usado ILIKE ${"%" + filtros.emailLike + "%"}`);
  const whereSql = whereParts.length === 0
    ? sql``
    : sql`WHERE ${whereParts.reduce((acc, p, i) => i === 0 ? p : sql`${acc} AND ${p}`)}`;

  const events = await sql<AuditRowRaw[]>`
    SELECT a.id_evento, a.ocurrido_en, a.id_usuario, a.email_usado, a.evento,
           a.recurso, a.ip, a.user_agent, a.exitoso, a.detalle,
           u.nombre AS nombre_usuario
    FROM   sgs_adm_auditoria_acceso a
    LEFT JOIN sgs_adm_usuario u ON u.id_usuario = a.id_usuario
    ${whereSql}
    ORDER BY a.ocurrido_en DESC
    LIMIT ${limit} OFFSET ${offset};
  `;
  const totalRows = await sql<{ count: number | string }[]>`
    SELECT COUNT(*)::int AS count
    FROM   sgs_adm_auditoria_acceso a
    ${whereSql};
  `;
  return {
    rows: events.map(mapAuditRow),
    total: pgInt(totalRows[0]?.count),
  };
}

export async function listEventTypes(): Promise<AuditEvento[]> {
  return ["LOGIN_OK", "LOGIN_FAIL", "LOGOUT", "ACCESS_DENY"];
}
