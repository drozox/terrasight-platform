"use client";

// =============================================================================
// Sidebar — cliente (necesita usePathname para highlight).
// Acepta un `rol` opcional; si está presente, filtra los items visibles.
// =============================================================================

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
  Filter as FilterIcon,
  RefreshCw,
  Droplet,
  BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TerraSightLogo } from "@/components/icons";
import type { RolSistema } from "@/lib/auth";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  // null = visible para cualquier rol logueado.
  roles: readonly RolSistema[] | null;
};

const ALL_ITEMS: Item[] = [
  { href: "/",               label: "Inicio",             icon: HomeIcon,    roles: null },
  { href: "/mapa",           label: "Mapa 2D / 3D",       icon: MapIcon,     roles: null },
  { href: "/dashboard",      label: "Dashboard",          icon: BarChart3,   roles: null },
  { href: "/predios",        label: "Predios",            icon: Building2,   roles: null },
  { href: "/quebradas",      label: "Quebradas",          icon: Droplet,     roles: null },
  { href: "/intervenciones", label: "Intervenciones",     icon: Wrench,      roles: null },
  { href: "/catalogos",      label: "Catálogos",          icon: BookMarked,  roles: ["ADMIN"] },
  { href: "/monitoreo",      label: "Monitoreo",          icon: Activity,    roles: ["ADMIN", "GESTOR"] },
  { href: "/analisis",       label: "Análisis Espacial",  icon: PieChart,    roles: ["ADMIN", "ANALISTA"] },
  { href: "/reportes",       label: "Reportes",           icon: FileText,    roles: ["ADMIN", "ANALISTA"] },
  { href: "/alertas",        label: "Alertas",            icon: Bell,        roles: ["ADMIN", "ANALISTA"] },
  { href: "/configuracion",  label: "Configuración",      icon: SettingsIcon, roles: ["ADMIN"] },
];

export function Sidebar({ rol }: { rol?: RolSistema | null }) {
  const pathname = usePathname();
  const [depto, setDepto] = React.useState("Cundinamarca");
  const [municipio, setMunicipio] = React.useState("Todos");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [lastUpdate, setLastUpdate] = React.useState("16/05/2025");

  React.useEffect(() => {
    if (refreshKey > 0) {
      const fmt = new Intl.DateTimeFormat("es-CO", {
        day: "2-digit", month: "2-digit", year: "numeric",
      }).format(new Date());
      setLastUpdate(fmt);
    }
  }, [refreshKey]);

  const navItems = React.useMemo(
    () => (rol ? ALL_ITEMS.filter((it) => it.roles === null || it.roles.includes(rol)) : ALL_ITEMS),
    [rol],
  );

  return (
    <aside
      className={cn(
        "flex h-screen w-64 flex-shrink-0 flex-col overflow-y-auto",
        "border-r border-outline-variant bg-surface-container-low py-md transition-all",
      )}
    >
      <div className="mb-lg px-md">
        <Link href="/" className="flex items-center gap-3">
          <TerraSightLogo className="h-10 w-10 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold leading-tight text-secondary">
              Cundinamarca
            </h1>
            <p className="text-body-sm text-on-surface-variant">
              Gestión Territorial
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-2" aria-label="Navegación principal">
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

      <div className="mt-auto border-t border-outline-variant/30 px-md pt-lg">
        <h3 className="mb-3 px-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
          Filtros territoriales
        </h3>
        <div className="space-y-3 px-2">
          <div>
            <label className="mb-1 block text-[11px] text-on-surface-variant">
              Departamento
            </label>
            <select
              value={depto}
              onChange={(e) => setDepto(e.target.value)}
              className="w-full rounded-lg border-none bg-surface-container-highest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option>Cundinamarca</option>
              <option>Boyacá</option>
              <option>Meta</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-on-surface-variant">
              Municipio
            </label>
            <select
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              className="w-full rounded-lg border-none bg-surface-container-highest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option>Todos</option>
              <option>Guasca</option>
              <option>Cogua</option>
              <option>San Rafael</option>
              <option>Río Negro</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2.5",
              "font-bold text-label-lg text-on-secondary transition-all hover:bg-secondary/90 active:scale-[0.98]",
            )}
          >
            <FilterIcon className="size-4" />
            Aplicar Filtros
          </button>
        </div>
        <div className="mt-6 flex items-center gap-2 px-2 text-[11px] text-on-surface-variant">
          <RefreshCw
            className={cn(
              "size-3 transition-transform",
              refreshKey > 0 && "text-primary",
            )}
          />
          <span>
            Última actualización:{" "}
            <span className="font-bold text-on-surface-variant">{lastUpdate}</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
