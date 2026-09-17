"use client";

// =============================================================================
// Sidebar — cliente (usePathname para highlight).
//   - RETRÁCTIL: colapsado muestra solo íconos; estado persistido en localStorage.
//   - Verde oscuro institucional (mismo degradado del login).
//   - Ilustración botánica (con transparencia) al pie: se oculta si falta el
//     archivo o si el panel está colapsado.
// =============================================================================

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SigTerritorioLogo } from "@/components/icons";
import { SidebarIllustration } from "./sidebar-illustration";
import { itemsParaRol, esActivo } from "./nav-items";
import type { RolSistema } from "@/lib/auth";

export function Sidebar({ rol }: { rol?: RolSistema | null }) {
  const pathname = usePathname();
  const navItems = React.useMemo(() => itemsParaRol(rol), [rol]);
  const [collapsed, setCollapsed] = React.useState(false);
  const [artFailed, setArtFailed] = React.useState(false);

  React.useEffect(() => {
    try {
      if (localStorage.getItem("inicio.sidebar.collapsed") === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("inicio.sidebar.collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden flex-shrink-0 flex-col overflow-hidden text-white lg:flex lg:h-screen",
        "bg-gradient-to-b from-[#0b3d24] via-[#0a5c30] to-[#06281a]",
        "transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      {/* Marca */}
      <div className={cn("flex items-center px-md pt-md", collapsed && "justify-center px-2")}>
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <SigTerritorioLogo
            className={cn("shrink-0 rounded-lg", collapsed ? "h-9 w-9" : "h-10 w-10")}
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-lg font-bold leading-tight text-white">
                SIG Territorio
              </p>
              <p className="truncate text-[11px] text-white/70">Gestión Territorial</p>
            </div>
          )}
        </Link>
      </div>

      {/* Botón colapsar/expandir (discreto, al pie) */}

      <nav className="mt-md flex-1 space-y-1 overflow-y-auto px-2" aria-label="Navegación principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = esActivo(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "mx-1 my-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-label-lg transition-colors",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-white font-bold text-[#0b3d24] shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Ilustración botánica al pie. Usa el PNG si está; si no, un SVG inline. */}
      {!collapsed && (
        <div className="px-md pt-md">
          {artFailed ? (
            <SidebarIllustration className="mx-auto w-40 opacity-70" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/logos/flores-logo.png"
              alt=""
              aria-hidden="true"
              className="mx-auto w-40 opacity-80"
              onError={() => setArtFailed(true)}
            />
          )}
        </div>
      )}

      <div className={cn("mt-auto border-t border-white/15 px-md py-md", collapsed && "px-2")}>
        {!collapsed && (
          <>
            <p className="px-2 text-[11px] leading-relaxed text-white/70">
              Convenio CAR · WWF · Fundación Natura
            </p>
            <p className="mt-1 px-2 text-[10px] text-white/50">Plataforma SIG integrada</p>
          </>
        )}
        <div className={cn("mt-3 flex", collapsed ? "justify-center" : "justify-end")}>
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            aria-pressed={collapsed}
            className="flex size-7 items-center justify-center rounded-md text-white/45 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
