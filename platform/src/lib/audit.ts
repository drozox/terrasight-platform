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
  evento: "LOGIN_OK" | "LOGIN_FAIL" | "LOGOUT" | "ACCESS_DENY" | "ACCOUNT_LOCKED";
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

// -----------------------------------------------------------------------------
// auditAccountLocked — emitido cuando:
//   1. Se cumple el umbral de 5 intentos fallidos y la cuenta pasa a bloqueada.
//   2. Un usuario bloqueado intenta loguearse (rechazo sin chequear password).
// `intentosF` ayuda al admin a distinguir ambos casos en la bitácora.
// -----------------------------------------------------------------------------
export async function auditAccountLocked(
  args: {
    idUsuario: number | null;
    emailUsado: string;
    intentosF: number;
    motivo: "umbral_alcanzado" | "intento_con_cuenta_bloqueada";
    detalle?: string | null;
  },
  ctx?: AuditContext,
): Promise<void> {
  const detalleBase = args.motivo === "umbral_alcanzado"
    ? `Cuenta bloqueada tras ${args.intentosF} intentos fallidos`
    : `Intento de login con cuenta bloqueada (intentos_fallidos=${args.intentosF})`;
  await writeAudit({
    idUsuario: args.idUsuario,
    emailUsado: args.emailUsado,
    evento: "ACCOUNT_LOCKED",
    exitoso: false,
    detalle: args.detalle ? `${detalleBase} · ${args.detalle}` : detalleBase,
    ctx,
  });
}
