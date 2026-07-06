"use client";

// =============================================================================
// Tabla admin/usuarios — Client Component.
//
// Estado:
//   - showNewForm   : muestra/oculta el form de crear
//   - editId        : idUsuario de la fila que se está editando (o null)
//   - resetId       : idUsuario al que se le está reseteando pass (o null)
//   - flash         : {tipo, msg} toast chico arriba
//
// NO maneja la mutación por sí mismo — delega en Server Actions (actions.ts).
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, KeyRound, Power, UserPlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RolSistema } from "@/lib/auth";
import type { UsuarioAdmin } from "@/lib/repository";
import {
  crearUsuarioAction,
  actualizarUsuarioAction,
  resetPasswordAction,
  toggleActivoAction,
} from "./actions";

const ROL_LABELS: Record<RolSistema, string> = {
  ADMIN:    "Administrador",
  ANALISTA: "Analista",
  GESTOR:   "Gestor",
};

type Flash = { tipo: "ok" | "error"; msg: string };

function fmtFecha(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

export function AdminUsuariosTable({
  initialUsuarios,
  roles,
}: {
  initialUsuarios: UsuarioAdmin[];
  roles: RolSistema[];
}) {
  const router = useRouter();
  const [usuarios] = React.useState(initialUsuarios);
  const [showNew, setShowNew] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [resetId, setResetId] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [flash, setFlash] = React.useState<Flash | null>(null);

  function showFlash(f: Flash, ttl = 4000) {
    setFlash(f);
    if (ttl > 0) setTimeout(() => setFlash(null), ttl);
  }

  function done() {
    setBusy(false);
    setShowNew(false);
    setEditId(null);
    setResetId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {flash && (
        <div
          role="status"
          className={
            flash.tipo === "ok"
              ? "flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-body-sm text-primary"
              : "flex items-start gap-2 rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error"
          }
        >
          {flash.tipo === "ok"
            ? <CheckCircle2 className="mt-0.5 size-4 flex-shrink-0" />
            : <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />}
          <span>{flash.msg}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {!showNew && (
          <Button onClick={() => setShowNew(true)}>
            <UserPlus className="size-4" />
            Nuevo usuario
          </Button>
        )}
      </div>

      {showNew && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <h2 className="mb-3 text-lg font-semibold text-on-surface">Nuevo usuario</h2>
          <NewUserForm
            roles={roles}
            disabled={busy}
            onCancel={() => setShowNew(false)}
            onSubmit={async (fd) => {
              setBusy(true);
              const res = await crearUsuarioAction(fd);
              if (res.ok) showFlash({ tipo: "ok", msg: res.message });
              else showFlash({ tipo: "error", msg: res.message });
              if (res.ok) done();
              else setBusy(false);
            }}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low text-[11px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Último acceso</th>
              <th className="px-4 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {usuarios.map((u) => (
              <React.Fragment key={u.idUsuario}>
                <tr className="hover:bg-surface-container-low/40">
                  <td className="px-4 py-3 font-mono text-[12px] text-on-surface">
                    {u.email}
                  </td>
                  <td className="px-4 py-3 text-on-surface">{u.nombre}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {ROL_LABELS[u.rol]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.activo ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
                        <span className="size-2 rounded-full bg-primary" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-on-surface-variant">
                        <span className="size-2 rounded-full bg-on-surface-variant/40" /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-on-surface-variant">
                    {fmtFecha(u.ultimoAccesoEn)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Editar"
                        onClick={() => { setEditId(editId === u.idUsuario ? null : u.idUsuario); setResetId(null); }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Resetear contraseña"
                        onClick={() => { setResetId(resetId === u.idUsuario ? null : u.idUsuario); setEditId(null); }}
                      >
                        <KeyRound className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={u.activo ? "ghost" : "secondary"}
                        title={u.activo ? "Desactivar" : "Activar"}
                        onClick={async () => {
                          setBusy(true);
                          const fd = new FormData();
                          fd.set("idUsuario", String(u.idUsuario));
                          fd.set("activo", u.activo ? "false" : "true");
                          const res = await toggleActivoAction(fd);
                          if (res.ok) showFlash({ tipo: "ok", msg: res.message });
                          else showFlash({ tipo: "error", msg: res.message });
                          done();
                        }}
                      >
                        <Power className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>

                {editId === u.idUsuario && (
                  <tr className="bg-surface-container-low/60">
                    <td colSpan={6} className="px-4 py-3">
                      <h3 className="mb-3 text-sm font-semibold text-on-surface">Editar {u.email}</h3>
                      <EditUserForm
                        usuario={u}
                        roles={roles}
                        disabled={busy}
                        onCancel={() => setEditId(null)}
                        onSubmit={async (fd) => {
                          setBusy(true);
                          const res = await actualizarUsuarioAction(fd);
                          if (res.ok) showFlash({ tipo: "ok", msg: res.message });
                          else showFlash({ tipo: "error", msg: res.message });
                          if (res.ok) done();
                          else setBusy(false);
                        }}
                      />
                    </td>
                  </tr>
                )}

                {resetId === u.idUsuario && (
                  <tr className="bg-surface-container-low/60">
                    <td colSpan={6} className="px-4 py-3">
                      <h3 className="mb-1 text-sm font-semibold text-on-surface">
                        Resetear contraseña de {u.email}
                      </h3>
                      <p className="mb-3 text-[11px] text-on-surface-variant">
                        Comunicá esta contraseña al usuario por un canal seguro y
                        pedile que la cambie en su primer login. (TODO: cambio
                        por usuario mismo en próxima iteración.)
                      </p>
                      <ResetPasswordForm
                        idUsuario={u.idUsuario}
                        disabled={busy}
                        onCancel={() => setResetId(null)}
                        onSubmit={async (fd) => {
                          setBusy(true);
                          const res = await resetPasswordAction(fd);
                          if (res.ok) showFlash({ tipo: "ok", msg: res.message });
                          else showFlash({ tipo: "error", msg: res.message });
                          if (res.ok) done();
                          else setBusy(false);
                        }}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                  No hay usuarios todavía. Creá el primero con "Nuevo usuario".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-componentes de formularios (no exportados; uso interno)
// -----------------------------------------------------------------------------

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-label-lg font-medium text-on-surface">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-error">{error}</span>}
    </label>
  );
}

function NewUserForm({
  roles,
  disabled,
  onSubmit,
  onCancel,
}: {
  roles: RolSistema[];
  disabled: boolean;
  onSubmit: (fd: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-4"
      action={onSubmit}
    >
      <Field label="Email">
        <Input name="email" type="email" autoComplete="off" required />
      </Field>
      <Field label="Nombre">
        <Input name="nombre" type="text" required minLength={2} />
      </Field>
      <Field label="Contraseña inicial">
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Rol">
        <select
          name="rol"
          defaultValue="GESTOR"
          className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {roles.map((r) => (
            <option key={r} value={r}>{ROL_LABELS[r]}</option>
          ))}
        </select>
      </Field>

      <div className="sm:col-span-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={disabled}>
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          {disabled && <Loader2 className="size-4 animate-spin" />}
          Crear
        </Button>
      </div>
    </form>
  );
}

function EditUserForm({
  usuario,
  roles,
  disabled,
  onSubmit,
  onCancel,
}: {
  usuario: UsuarioAdmin;
  roles: RolSistema[];
  disabled: boolean;
  onSubmit: (fd: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-4"
      action={onSubmit}
    >
      <input type="hidden" name="idUsuario" value={usuario.idUsuario} />
      <Field label="Email (no editable)">
        <Input value={usuario.email} disabled />
      </Field>
      <Field label="Nombre">
        <Input name="nombre" type="text" defaultValue={usuario.nombre} required minLength={2} />
      </Field>
      <Field label="Rol">
        <select
          name="rol"
          defaultValue={usuario.rol}
          className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {roles.map((r) => (
            <option key={r} value={r}>{ROL_LABELS[r]}</option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-2 self-end pb-2">
        <input
          type="checkbox"
          name="activo"
          defaultChecked={usuario.activo}
          value="true"
          className="size-4 rounded border-outline-variant text-primary focus:ring-primary"
        />
        <span className="text-label-lg text-on-surface">Cuenta activa</span>
      </label>

      <div className="sm:col-span-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={disabled}>
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          {disabled && <Loader2 className="size-4 animate-spin" />}
          Guardar
        </Button>
      </div>
    </form>
  );
}

function ResetPasswordForm({
  idUsuario,
  disabled,
  onSubmit,
  onCancel,
}: {
  idUsuario: number;
  disabled: boolean;
  onSubmit: (fd: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      action={onSubmit}
    >
      <input type="hidden" name="idUsuario" value={idUsuario} />
      <Field label="Nueva contraseña (mín 8)">
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={200}
        />
      </Field>
      <div className="ml-auto flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={disabled}>
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          {disabled && <Loader2 className="size-4 animate-spin" />}
          Resetear
        </Button>
      </div>
    </form>
  );
}
