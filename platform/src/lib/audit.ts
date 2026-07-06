// =============================================================================
// Auditoría de accesos (HU-AD-04).
//
// Helpers para escribir en `sgs_adm_auditoria_acceso`. Todos son safe-fail:
// un error aquí NUNCA debe romper un login o navegación del usuario.
// =============================================================================

import { sql } from "@/lib/db";

// -----------------------------------------------------------------------------
// Headers opcionales (mejor-esfuerzo — vienen del request actual cuando aplica)
// -----------------------------------------------------------------------------
export type AuditContext = {
  recurso?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

// -----------------------------------------------------------------------------
// writeAudit — primitiva única. Usar por debajo.
// -----------------------------------------------------------------------------
async function writeAudit(args: {
  idUsuario: number | null;
  emailUsado: string | null;
  evento: "LOGIN_OK" | "LOGIN_FAIL" | "LOGOUT" | "ACCESS_DENY";
  exitoso: boolean;
  detalle: string | null;
  ctx?: AuditContext;
}): Promise<void> {
  try {
    await sql`
      INSERT INTO sgs_adm_auditoria_acceso (
        id_usuario, email_usado, evento, exitoso, detalle, recurso, ip, user_agent
      ) VALUES (
        ${args.idUsuario},
        ${args.emailUsado},
        ${args.evento},
        ${args.exitoso},
        ${args.detalle},
        ${args.ctx?.recurso ?? null},
        ${args.ctx?.ip ?? null},
        ${args.ctx?.userAgent ?? null}
      );
    `;
  } catch (err) {
    // Importante: NO propagamos. Si la auditoría falla, el usuario sigue
    // pudiendo loguearse; sólo queda el hueco en la bitácora.
    console.warn("[terrasight/audit] no se pudo escribir evento:", (err as Error).message);
  }
}

// -----------------------------------------------------------------------------
// Helpers semánticos
// -----------------------------------------------------------------------------
export async function auditLoginOk(
  args: { idUsuario: number; emailUsado: string },
  ctx?: AuditContext,
): Promise<void> {
  await writeAudit({
    idUsuario: args.idUsuario,
    emailUsado: args.emailUsado,
    evento: "LOGIN_OK",
    exitoso: true,
    detalle: null,
    ctx,
  });
}

export async function auditLoginFail(
  args: { emailUsado: string | null; idUsuario?: number | null; evento: "LOGIN_FAIL"; detalle: string },
  ctx?: AuditContext,
): Promise<void> {
  await writeAudit({
    idUsuario: args.idUsuario ?? null,
    emailUsado: args.emailUsado,
    evento: args.evento,
    exitoso: false,
    detalle: args.detalle,
    ctx,
  });
}

export async function auditLogout(
  args: { idUsuario: number | null; emailUsado: string | null },
  ctx?: AuditContext,
): Promise<void> {
  await writeAudit({
    idUsuario: args.idUsuario,
    emailUsado: args.emailUsado,
    evento: "LOGOUT",
    exitoso: true,
    detalle: null,
    ctx,
  });
}

export async function auditAccessDeny(
  args: { idUsuario: number | null; emailUsado: string | null; detalle: string },
  ctx?: AuditContext,
): Promise<void> {
  await writeAudit({
    idUsuario: args.idUsuario,
    emailUsado: args.emailUsado,
    evento: "ACCESS_DENY",
    exitoso: false,
    detalle: args.detalle,
    ctx,
  });
}
