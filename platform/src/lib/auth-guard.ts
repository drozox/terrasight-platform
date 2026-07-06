// =============================================================================
// Auth-guards: helpers para Server Components y Route Handlers.
//
// `auth()` está provisto por `@/lib/auth` (NextAuth v5) y resuelve el JWT
// de la cookie en cada request. NO toca la BD.
// =============================================================================

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "./auth";
import { auditAccessDeny, type AuditContext } from "./audit";
import type { RolSistema } from "./auth";

// -----------------------------------------------------------------------------
// Tipos exportados
// -----------------------------------------------------------------------------
export type SessionUser = {
  idUsuario: number;
  email: string;
  name: string;
  rol: RolSistema;
};

// -----------------------------------------------------------------------------
// getCurrentUser — devuelve el usuario o null (no redirige). Útil para UI
// condicional tipo "mostrar botón admin solo si soy ADMIN".
// -----------------------------------------------------------------------------
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.idUsuario || !session.user.rol) return null;
  return {
    idUsuario: session.user.idUsuario,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    rol: session.user.rol,
  };
}

// -----------------------------------------------------------------------------
// auditContextFromHeaders — best-effort IP/user-agent desde Next headers.
// -----------------------------------------------------------------------------
export async function auditContextFromHeaders(): Promise<AuditContext> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    const ip = fwd ? fwd.split(",")[0]?.trim() ?? null : h.get("x-real-ip");
    const ua = h.get("user-agent");
    const path = h.get("x-pathname") ?? h.get("referer");
    return {
      ip: ip ?? null,
      userAgent: ua ? ua.slice(0, 255) : null,
      recurso: path ?? null,
    };
  } catch {
    return { recurso: null, ip: null, userAgent: null };
  }
}

// -----------------------------------------------------------------------------
// requireUser — para Server Components que requieren sesión.
// Redirige a /login si no hay sesión. Devuelve el usuario.
// -----------------------------------------------------------------------------
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// -----------------------------------------------------------------------------
// requireRole — para Server Components que requieren 1+ roles.
// Redirige a /dashboard si el rol no está en la lista (después de loguearse).
// Registra el intento en auditoría con detalle del rol requerido vs actual.
// -----------------------------------------------------------------------------
export async function requireRole(
  rolesPermitidos: readonly RolSistema[],
): Promise<SessionUser> {
  const user = await requireUser();
  if (rolesPermitidos.includes(user.rol)) return user;

  const ctx = await auditContextFromHeaders();
  await auditAccessDeny({
    idUsuario: user.idUsuario,
    emailUsado: user.email,
    detalle: `rol requerido ${rolesPermitidos.join("|")}, real ${user.rol}`,
  }, ctx);

  redirect("/dashboard?denegado=1");
}

// Atajos:
export const requireAdmin = () => requireRole(["ADMIN"] as const);
export const requireAnalista = () => requireRole(["ADMIN", "ANALISTA"] as const);
