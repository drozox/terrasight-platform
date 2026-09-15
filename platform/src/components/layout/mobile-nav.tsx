"use client";

// =============================================================================
// MobileNav — drawer de navegación para < lg (UX-36).
// El Sidebar de desktop es `hidden lg:flex`; sin esto, en móvil no había forma
// de navegar. Este componente aporta el botón hamburguesa + el panel deslizante.
// =============================================================================

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SigTerritorioLogo } from "@/components/icons";
import { itemsParaRol, esActivo } from "./nav-items";
import type { RolSistema } from "@/lib/auth";

export function MobileNav({ rol }: { rol?: RolSistema | null }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const items = itemsParaRol(rol);

  // Cierra al navegar.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape para cerrar + bloqueo de scroll del body mientras está abierto.
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Abrir menú de navegación"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Menu className="size-6" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[1000]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navegación principal"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-surface-container-low shadow-2xl animate-in slide-in-from-left duration-200"
          >
            <div className="flex items-center justify-between gap-3 px-md py-md">
              <Link href="/" className="flex min-w-0 items-center gap-3">
                <SigTerritorioLogo className="h-10 w-10 rounded-lg" />
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold leading-tight text-secondary">
                    SIG TERRITORIO
                  </p>
                  <p className="truncate text-body-sm text-on-surface-variant">
                    CAR · WWF · Fundación Natura
                  </p>
                </div>
              </Link>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 px-2" aria-label="Navegación principal">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = esActivo(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "mx-2 my-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-label-lg transition-colors",
                      isActive
                        ? "bg-primary text-on-primary shadow-sm"
                        : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface",
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-outline-variant/50 px-md py-md">
              <p className="px-2 text-[11px] leading-relaxed text-on-surface-variant/70">
                Convenio CAR · WWF · Fundación Natura
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
