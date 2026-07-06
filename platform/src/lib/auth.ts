// =============================================================================
// NextAuth v5 — configuración de autenticación para TerraSight.
//
// Decisiones:
// - Provider: Credentials (email + password). No OAuth en MVP.
// - Sesiones: JWT en cookie HTTP-only (stateless). Sin tabla de sesiones.
// - Hash: bcryptjs rounds=10 (puro JS, sin compilación nativa).
// - Auditoría: se escribe el evento resultante en `sgs_adm_auditoria_acceso`
//   desde `authorize` (login fail / login ok) y desde `events.signOut`.
// - Identificador numérico del usuario: usamos `idUsuario: number` como campo
//   propio en sesión/JWT. `User.id` queda como string (default de next-auth)
//   porque NO se puede redefinir su tipo en la augmentation.
// =============================================================================

import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { sql, pgInt, pgText } from "@/lib/db";
import {
  auditLoginFail,
  auditLoginOk,
  auditLogout,
} from "@/lib/audit";

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------

export type RolSistema = "ADMIN" | "ANALISTA" | "GESTOR";

declare module "next-auth" {
  /** Salida del `authorize()` del provider. */
  interface User {
    rol: RolSistema;
    idUsuario: number;
  }

  interface Session {
    user: {
      idUsuario: number;
      rol: RolSistema;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    idUsuario: number;
    rol: RolSistema;
  }
}

// -----------------------------------------------------------------------------
// Lookup del usuario en la BD. Si la BD está caída: captura el caller y
// devuelve null silenciosamente (el `authorize` loguea el fallo).
// -----------------------------------------------------------------------------
type UsuarioRow = {
  id_usuario: number | string;
  email: string;
  nombre: string;
  password_hash: string;
  rol: RolSistema;
  activo: boolean | string;
};

async function fetchUserByEmail(email: string): Promise<UsuarioRow | null> {
  const rows = await sql<UsuarioRow[]>`
    SELECT u.id_usuario, u.email, u.nombre, u.password_hash, u.activo,
           r.nombre AS rol
    FROM   sgs_adm_usuario u
    JOIN   sgs_adm_rol      r ON r.id_rol = u.id_rol
    WHERE  lower(u.email) = lower(${email})
    LIMIT  1;
  `;
  return rows[0] ?? null;
}

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true, // permite operar detrás de proxies (entornos on-prem típicos)
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8 h
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").trim();
        const password = String(creds?.password ?? "");

        if (!email || !password) {
          await auditLoginFail({ emailUsado: email, evento: "LOGIN_FAIL", detalle: "campos vacíos" });
          return null;
        }

        let usuario: UsuarioRow | null;
        try {
          usuario = await fetchUserByEmail(email);
        } catch (err) {
          await auditLoginFail({
            emailUsado: email,
            evento: "LOGIN_FAIL",
            detalle: "error de BD en lookup",
          });
          console.error("[terrasight/auth] DB error en authorize:", (err as Error).message);
          return null;
        }

        if (!usuario) {
          await auditLoginFail({ emailUsado: email, evento: "LOGIN_FAIL", detalle: "email no existe" });
          return null;
        }

        if (!usuario.activo) {
          await auditLoginFail({ emailUsado: email, evento: "LOGIN_FAIL", detalle: "cuenta desactivada" });
          return null;
        }

        const passwordOk = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordOk) {
          await auditLoginFail({
            idUsuario: pgInt(usuario.id_usuario),
            emailUsado: email,
            evento: "LOGIN_FAIL",
            detalle: "password incorrecto",
          });
          return null;
        }

        // Login OK — actualizamos último acceso y auditamos.
        await sql`UPDATE sgs_adm_usuario SET ultimo_acceso_en = now() WHERE id_usuario = ${pgInt(usuario.id_usuario)};`;
        await auditLoginOk({
          idUsuario: pgInt(usuario.id_usuario),
          emailUsado: pgText(usuario.email),
        });

        return {
          // `id` es requerido por next-auth; usamos el email como clave única estable.
          id: pgText(usuario.email),
          email: pgText(usuario.email),
          name: pgText(usuario.nombre),
          idUsuario: pgInt(usuario.id_usuario),
          rol: usuario.rol,
        };
      },
    }),
  ],
  callbacks: {
    // Persistimos idUsuario+rol en el JWT para no pegarle a la BD en cada request.
    jwt: async ({ token, user }) => {
      if (user) {
        token.idUsuario = (user as { idUsuario: number }).idUsuario;
        token.rol = (user as { rol: RolSistema }).rol;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && typeof token.idUsuario === "number" && token.rol) {
        session.user.idUsuario = token.idUsuario;
        session.user.rol = token.rol;
      }
      return session;
    },
    redirect: async ({ url, baseUrl }) => {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return baseUrl;
    },
  },
  events: {
    signOut: async (message) => {
      // En JWT-strategy el callback recibe `{ token }`, en DB recibe
      // `{ session }`. Cubrimos ambos casos.
      const token = "token" in message ? message.token : null;
      const session = "session" in message ? message.session : null;

      // `session` puede ser AdapterSession (DB) o Session (JWT). Solo JWT
      // tiene la forma extendida con `user.idUsuario`; usamos un cast
      // seguro acotándolo a la forma conocida.
      type SessionWithOurFields = { user?: { idUsuario?: number; email?: string | null } };
      const sess = session as SessionWithOurFields | null | undefined;

      const idUsuario: number | null =
        token?.idUsuario ??
        sess?.user?.idUsuario ??
        null;
      const email: string | null =
        (token?.email as string | undefined) ??
        sess?.user?.email ??
        null;

      await auditLogout({ idUsuario, emailUsado: email });
    },
  },
});
