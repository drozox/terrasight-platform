// =============================================================================
// nav-items.ts — Fuente única de la navegación principal.
// La usan el Sidebar (desktop) y el MobileNav (drawer móvil).
// =============================================================================

import type { ComponentType } from "react";
import { HomeIcon, Building2, Wrench, FileText, Target, Info } from "lucide-react";
import type { RolSistema } from "@/lib/auth";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** null = visible para cualquier rol logueado. */
  roles: readonly RolSistema[] | null;
};

// Navegación reducida al ALCANCE del entregable del Convenio 3038-2024
// (ver docs/ALCANCE.md).
export const ALL_ITEMS: NavItem[] = [
  { href: "/",               label: "Inicio",             icon: HomeIcon,  roles: null },
  { href: "/predios",        label: "Predios",            icon: Building2, roles: null },
  { href: "/intervenciones", label: "Intervenciones",     icon: Wrench,    roles: null },
  { href: "/metas/convenio", label: "Metas del convenio", icon: Target,    roles: null },
  { href: "/reportes",       label: "Reportes",           icon: FileText,  roles: ["ADMIN", "ANALISTA"] },
  { href: "/informate",      label: "Infórmate",          icon: Info,      roles: null },
];

export function itemsParaRol(rol?: RolSistema | null): NavItem[] {
  if (!rol) return ALL_ITEMS;
  return ALL_ITEMS.filter((it) => it.roles === null || it.roles.includes(rol));
}

export function esActivo(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
