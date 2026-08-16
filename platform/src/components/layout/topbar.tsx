"use client";

// =============================================================================
// TopBar — recibe `usuario` desde el root layout (server-resolved vía JWT).
// Si NO hay sesión, muestra un botón "Iniciar sesión" en lugar del menú.
// El logout usa `signOut` de next-auth/react.
// =============================================================================

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  HelpCircle,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  LogIn,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { PartnerLogo } from "@/components/icons";
import { HelpDialog } from "@/components/layout/help-dialog";
import type { Alerta } from "@/lib/types";
import type { SessionUser } from "@/lib/auth-guard";
import { cn } from "@/lib/utils";

const ROL_LABEL: Record<SessionUser["rol"], string> = {
  ADMIN:    "Administrador",
  ANALISTA: "Analista Ambiental",
  GESTOR:   "Gestor de Campo",
};

function initialsFor(nombre: string, email: string): string {
  const n = nombre?.trim();
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export function TopBar({
  alertas,
  usuario,
}: {
  alertas?: Alerta[];
  usuario: SessionUser | null;
}) {
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [userOpen, setUserOpen] = React.useState(false);
  // UX-P3: el botón Ayuda (HelpCircle) antes era no-op. Ahora abre un dialog
  // con info del producto, atajos de teclado y contacto de soporte.
  const [helpOpen, setHelpOpen] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement>(null);
  const userRef = React.useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const alertasList = alertas ?? [];

  async function onLogout() {
    setUserOpen(false);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <header
      className="
        z-50 mx-auto flex h-16 w-full max-w-screen-2xl flex-shrink-0
        items-center justify-between
        border-b border-outline-variant bg-surface px-margin-edge
      "
    >
      <div className="flex items-center gap-4">
        <div>
          {/* UX-78: el brand de la app NO es un heading. Cada page provee su
             <h1> propio. Antes era <h2>, pero "Plataforma SIG Integrada"
             es un brand repetido en TODAS las pages — no es el título de
             ninguna. Era ruido para screen readers + violaba la jerarquía
             de headings. */}
          <p className="text-xl font-bold text-primary">Plataforma SIG Integrada</p>
          <p className="text-label-lg text-on-surface-variant">
            Monitoreo Ambiental y Gestión Territorial
          </p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-6">
          <PartnerLogo name="wwf"    src="/partners/wwf-panda.png"  className="h-8" />
          <PartnerLogo name="car"    src="/partners/car.png"         className="h-8" />
          <PartnerLogo name="natura" src="/partners/natura-2018.png" className="h-8" />
        </div>

        <div className="flex items-center gap-1 border-l border-outline-variant pl-4">
          {/* Notificaciones (solo si hay sesión) */}
          {usuario && (
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                aria-label={
                  alertasList.length > 0
                    ? `Notificaciones (${alertasList.length} sin leer)`
                    : "Notificaciones"
                }
                onClick={() => setNotifOpen((v) => !v)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
              >
                <Bell className="size-5" aria-hidden="true" />
                {alertasList.length > 0 && (
                  // UX-21: screen readers oían "5" sin contexto. Ahora aria-label
                  // del button dice "Notificaciones (5 sin leer)".
                  <span
                    aria-hidden="true"
                    className="absolute right-2 top-2 inline-flex size-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error"
                  >
                    {alertasList.length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div
                  className={cn(
                    "absolute right-0 top-12 z-50 w-80 origin-top-right rounded-xl border border-outline-variant",
                    "bg-surface-container-lowest p-3 shadow-xl animate-in fade-in slide-in-from-top-1",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h3 className="text-label-lg font-bold uppercase text-on-surface-variant">
                      Notificaciones
                    </h3>
                    <span className="text-[10px] text-on-surface-variant">
                      {alertasList.length} activas
                    </span>
                  </div>
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {alertasList.length === 0 ? (
                      <p className="p-4 text-center text-body-sm text-on-surface-variant">
                        Sin alertas activas
                      </p>
                    ) : (
                      alertasList.map((a) => (
                        <div
                          key={a.id}
                          className={cn(
                            "rounded-lg border-l-4 bg-surface-container-low p-3 transition-colors hover:bg-surface-variant/40",
                            a.tipo === "error"   && "border-error",
                            a.tipo === "warning" && "border-warning",
                            a.tipo === "info"    && "border-info",
                          )}
                        >
                          <div className="mb-1 flex justify-between text-[10px] font-bold text-on-surface-variant">
                            <span>{a.titulo}</span>
                            <span>{a.fecha}</span>
                          </div>
                          <p className="text-body-sm leading-tight text-on-surface">
                            {a.descripcion}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <Link
                    href="/alertas"
                    className="mt-3 block rounded-md py-2 text-center text-label-lg font-bold text-primary transition-colors hover:bg-primary/5"
                    onClick={() => setNotifOpen(false)}
                  >
                    Ver todas las alertas
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Ayuda — antes no-op; ahora abre HelpDialog con info + atajos + mailto */}
          <button
            type="button"
            aria-label="Ayuda y soporte"
            title="Ayuda y soporte"
            onClick={() => setHelpOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <HelpCircle className="size-5" />
          </button>

          {/* Usuario — botón de login si NO hay sesión, menú si sí */}
          {usuario ? (
            <div className="relative" ref={userRef}>
              <button
                type="button"
                onClick={() => setUserOpen((v) => !v)}
                className="ml-2 flex items-center gap-3 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-surface-container-low"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-label-lg font-bold text-on-primary">
                  {initialsFor(usuario.name, usuario.email)}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-label-lg font-bold leading-none text-on-surface">
                    {usuario.name || usuario.email}
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    {ROL_LABEL[usuario.rol]}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "size-4 text-on-surface-variant transition-transform",
                    userOpen && "rotate-180",
                  )}
                />
              </button>
              {userOpen && (
                <div
                  className={cn(
                    "absolute right-0 top-12 z-50 w-56 origin-top-right rounded-xl border border-outline-variant",
                    "bg-surface-container-lowest p-2 shadow-xl animate-in fade-in slide-in-from-top-1",
                  )}
                >
                  <div className="mb-2 border-b border-outline-variant px-3 py-2">
                    <p className="text-label-lg font-bold text-on-surface">
                      {usuario.name || usuario.email}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      {usuario.email}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {ROL_LABEL[usuario.rol]}
                    </p>
                  </div>
                  <Link
                    href="/configuracion"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-body-sm text-on-surface transition-colors hover:bg-surface-variant/40"
                    onClick={() => setUserOpen(false)}
                  >
                    <UserIcon className="size-4" /> Mi perfil
                  </Link>
                  {/* Admin solo ve Gestión de usuarios y Auditoría */}
                  {usuario.rol === "ADMIN" && (
                    <Link
                      href="/admin/usuarios"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-body-sm text-on-surface transition-colors hover:bg-surface-variant/40"
                      onClick={() => setUserOpen(false)}
                    >
                      <SettingsIcon className="size-4" /> Gestión de usuarios
                    </Link>
                  )}
                  <div className="my-1 border-t border-outline-variant" />
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-body-sm text-error transition-colors hover:bg-error/5"
                  >
                    <LogOut className="size-4" /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-2 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-label-lg font-bold text-on-primary transition-colors hover:bg-primary/90"
            >
              <LogIn className="size-4" />
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>

      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </header>
  );
}
