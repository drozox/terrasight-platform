"use client";

// =============================================================================
// Sidebar — cliente (necesita usePathname para highlight).
// Acepta un `rol` opcional; si está presente, filtra los items visibles.
//
// UX-03/UX-48 (audit 2026-07-24): los selects de "Filtros territoriales" y el
// botón "Aplicar Filtros" eran CONTROLES PLACEBO. El useState local no se
// conectaba a nada — clickearlos solo cambiaba la fecha del footer. Era un
// anti-patrón clásico. Decisión: SACAR todo el bloque. Los filtros de verdad
// viven en cada vista (predios tiene su search, intervenciones tiene chips
// por componente, mapa tiene layers panel). El sidebar vuelve a ser solo
// navegación.
//
// UX-02/UX-49: el "Última actualización: 16/05/2025" estaba hardcodeado
// como initial state. También se va con el bloque. Si el cliente lo pide,
// en un sprint futuro lo conectamos a `pingDb()` server-side.
// =============================================================================

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SigTerritorioLogo } from "@/components/icons";
import { itemsParaRol, esActivo } from "./nav-items";
import type { RolSistema } from "@/lib/auth";

export function Sidebar({ rol }: { rol?: RolSistema | null }) {
  const pathname = usePathname();
  const navItems = React.useMemo(() => itemsParaRol(rol), [rol]);

  return (
    // UX-34/UX-36 (audit 2026-07-24): en mobile (< lg) el sidebar se esconde.
    // El siguiente sprint deberia implementar un drawer mobile (UX-36) — por
    // ahora el usuario en mobile solo ve el main full-width. En desktop se
    // mantiene como columna lateral de 256px fija.
    <aside
      className={cn(
        "hidden w-64 flex-shrink-0 flex-col overflow-y-auto",
        "border-r border-outline-variant/50 bg-surface-container-low py-md transition-[background-color,border-color]",
        "lg:flex lg:h-screen",
      )}
    >
      <div className="mb-lg px-md">
        <Link href="/" className="flex items-center gap-3">
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
      </div>

      <nav className="flex-1 space-y-1 px-2" aria-label="Navegación principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = esActivo(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "mx-2 my-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-label-lg transition-colors",
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

      {/* Footer: convención del convenio. UX-03/48 — antes había selects
          placebo + botón "Aplicar Filtros" + "Última actualización" hardcodeada.
          Sacado en audit 2026-07-24. Si en el futuro se quieren filtros
          globales, van en un store y se leen en cada vista server-side. */}
      {/* UX-70 (audit 2026-07-24): /30 era muy sutil, se perdia contra el
          surface-container-low. /50 da mejor contraste sin romper la
          jerarquía. */}
      <div className="mt-auto border-t border-outline-variant/50 px-md pt-lg">
        <p className="px-2 text-[11px] leading-relaxed text-on-surface-variant/70">
          Convenio CAR · WWF · Fundación Natura
        </p>
        <p className="mt-1 px-2 text-[10px] text-on-surface-variant/60">
          Plataforma SIG integrada
        </p>
      </div>
    </aside>
  );
}
