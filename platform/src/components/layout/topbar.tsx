"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  HelpCircle,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { PartnerLogo } from "@/components/icons";
import type { Alerta } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TopBar({ alertas }: { alertas?: Alerta[] }) {
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [userOpen, setUserOpen] = React.useState(false);
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

  return (
    <header
      className="
        z-50 flex h-16 w-full flex-shrink-0 items-center justify-between
        border-b border-outline-variant bg-surface px-margin-edge
      "
    >
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary">Plataforma SIG Integrada</h2>
          <p className="text-label-lg text-on-surface-variant">
            Monitoreo Ambiental y Gestión Territorial
          </p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-6">
          <PartnerLogo name="wwf"    src="/partners/wwf-panda.png"  className="h-8" />
          <PartnerLogo name="car"    src="/partners/car.png"          className="h-8" />
          <PartnerLogo name="natura" src="/partners/natura-2018.png" className="h-8" />
        </div>

        <div className="flex items-center gap-1 border-l border-outline-variant pl-4">
          {/* Notificaciones */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              aria-label="Notificaciones"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
            >
              <Bell className="size-5" />
              {alertasList.length > 0 && (
                <span className="absolute right-2 top-2 inline-flex size-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">
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

          {/* Ayuda */}
          <button
            type="button"
            aria-label="Ayuda"
            title="Ayuda y soporte"
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            <HelpCircle className="size-5" />
          </button>

          {/* Usuario */}
          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => setUserOpen((v) => !v)}
              className="ml-2 flex items-center gap-3 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-surface-container-low"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-label-lg font-bold text-on-primary">
                AM
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-label-lg font-bold leading-none text-on-surface">
                  Ana María
                </p>
                <p className="text-[11px] text-on-surface-variant">Administrador</p>
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
                  <p className="text-label-lg font-bold text-on-surface">Ana María</p>
                  <p className="text-[11px] text-on-surface-variant">
                    ana.maria@car.gov.co
                  </p>
                </div>
                <Link
                  href="/configuracion"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-body-sm text-on-surface transition-colors hover:bg-surface-variant/40"
                  onClick={() => setUserOpen(false)}
                >
                  <UserIcon className="size-4" /> Mi perfil
                </Link>
                <Link
                  href="/configuracion"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-body-sm text-on-surface transition-colors hover:bg-surface-variant/40"
                  onClick={() => setUserOpen(false)}
                >
                  <SettingsIcon className="size-4" /> Configuración
                </Link>
                <div className="my-1 border-t border-outline-variant" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-body-sm text-error transition-colors hover:bg-error/5"
                >
                  <LogOut className="size-4" /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}