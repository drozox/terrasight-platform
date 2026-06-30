"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  MapIcon,
  BarChart3,
  Building2,
  Wrench,
  Activity,
  PieChart,
  FileText,
  Bell,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TerraSightLogo } from "@/components/icons";

const navItems = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/mapa", label: "Mapa 2D / 3D", icon: MapIcon },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/predios", label: "Predios", icon: Building2 },
  { href: "/intervenciones", label: "Intervenciones", icon: Wrench },
  { href: "/monitoreo", label: "Monitoreo", icon: Activity },
  { href: "/analisis", label: "Análisis Espacial", icon: PieChart },
  { href: "/reportes", label: "Reportes", icon: FileText },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/configuracion", label: "Configuración", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      className="
        flex h-screen w-64 flex-shrink-0 flex-col overflow-y-auto
        border-r border-outline-variant bg-surface-container-low
        py-md transition-all
      "
    >
      <div className="mb-lg px-md">
        <Link href="/" className="flex items-center gap-3">
          <TerraSightLogo className="h-10 w-10 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold leading-tight text-secondary">
              Cundinamarca
            </h1>
            <p className="text-body-sm text-on-surface-variant">Gestión Territorial</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mx-2 my-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-label-lg transition-colors",
                isActive
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface",
              )}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-outline-variant/30 px-md pt-lg">
        <h3 className="mb-4 px-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
          Filtros territoriales
        </h3>
        <div className="space-y-4 px-2">
          <div>
            <label className="mb-1 block text-[11px] text-on-surface-variant">Departamento</label>
            <select className="w-full rounded-lg border-none bg-surface-container-highest px-3 py-2 text-sm focus:ring-1 focus:ring-primary">
              <option>Cundinamarca</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-on-surface-variant">Municipio</label>
            <select className="w-full rounded-lg border-none bg-surface-container-highest px-3 py-2 text-sm focus:ring-1 focus:ring-primary">
              <option>Todos</option>
            </select>
          </div>
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2.5 font-bold text-label-lg text-on-secondary transition-all hover:bg-opacity-90">
            <span className="material-symbols-outlined text-[18px]">filter_alt</span>
            Aplicar Filtros
          </button>
        </div>
        <div className="mt-8 flex items-center gap-2 px-2 text-[11px] text-on-surface-variant opacity-60">
          <span className="material-symbols-outlined text-[16px]">sync</span>
          Última actualización: 16/05/2025
        </div>
      </div>
    </aside>
  );
}
