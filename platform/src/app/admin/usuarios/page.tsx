// =============================================================================
// Página /admin/usuarios (HU-AD-02) — solo ADMIN.
// Server Component: requireAdmin + fetch + render del cliente.
// =============================================================================

import { requireAdmin } from "@/lib/auth-guard";
import { listUsuarios, listRoles } from "@/lib/repos";
import { AdminUsuariosTable } from "./usuarios-table";

export const metadata = { title: "Gestión de usuarios — SIG TERRITORIO" };

export default async function AdminUsuariosPage() {
  await requireAdmin();
  const [usuarios, roles] = await Promise.all([listUsuarios(), listRoles()]);
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-surface-container-lowest px-margin-edge py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Gestión de usuarios</h1>
        <p className="text-body-sm text-on-surface-variant">
          Alta, baja y modificación de las cuentas del sistema. Solo accesible para
          administradores.
        </p>
      </header>

      <AdminUsuariosTable initialUsuarios={usuarios} roles={roles} />

      <footer className="mt-10 border-t border-outline-variant pt-4 text-[11px] text-on-surface-variant">
        Las contraseñas se almacenan hasheadas con bcrypt (rounds 10) y nunca se
        devuelven al cliente. Los resets quedan registrados en la auditoría.
      </footer>
    </div>
  );
}
