// =============================================================================
// session-revalidate.ts — revalidación periódica de la cuenta contra la BD.
//
// Problema (D-DEBT-2): con estrategia JWT, desactivar un usuario o cambiarle el
// rol NO se refleja hasta que expira el token (8 h). Este helper consulta
// `sgs_adm_usuario` con un TTL corto (5 min) y cachea en memoria por proceso.
//
// Diseño seguro:
//   - SOLO se llama desde `getCurrentUser()` (server-only, Node runtime). NO se
//     usa en el `jwt` callback ni en el middleware (Edge) → postgres-js no entra
//     al bundle de Edge.
//   - Si la BD falla, NO invalida la sesión (devuelve `activo: true` y cachea el
//     estado "desconocido" por el TTL para no martillar la BD).
//   - Si el usuario no existe o está inactivo → `activo: false` ⇒ logout.
//   - Si el rol cambió → se propaga (los permisos se recalculan a los ≤5 min).
// =============================================================================

import type { RolSistema } from "./auth";
import { sql } from "./db";

const TTL_MS = 5 * 60 * 1000;

type Estado = { activo: boolean; rol: RolSistema | null; at: number };
const cache = new Map<number, Estado>();

/** Solo para tests: limpia el cache en memoria. */
export function resetAuthStateCache(): void {
  cache.clear();
}

export async function getUserAuthState(
  idUsuario: number,
): Promise<{ activo: boolean; rol: RolSistema | null }> {
  const now = Date.now();
  const hit = cache.get(idUsuario);
  if (hit && now - hit.at < TTL_MS) {
    return { activo: hit.activo, rol: hit.rol };
  }

  try {
    const rows = await sql<{ activo: boolean | string; rol: RolSistema }[]>`
      SELECT u.activo, r.nombre AS rol
      FROM   sgs_adm_usuario u
      JOIN   sgs_adm_rol      r ON r.id_rol = u.id_rol
      WHERE  u.id_usuario = ${idUsuario}
      LIMIT  1;
    `;
    const row = rows[0];
    const activo =
      !!row && (row.activo === true || row.activo === "t" || row.activo === "true");
    const rol = row ? row.rol : null;
    cache.set(idUsuario, { activo, rol, at: now });
    return { activo, rol };
  } catch {
    // BD caída: no invalidar. Cacheamos "desconocido" (activo true) por el TTL.
    cache.set(idUsuario, { activo: true, rol: null, at: now });
    return { activo: true, rol: null };
  }
}
