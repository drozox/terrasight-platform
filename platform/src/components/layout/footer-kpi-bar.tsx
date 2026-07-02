"use client";

import * as React from "react";
import {
  MapPin,
  Compass,
  Handshake,
  LayoutGrid,
  Droplets,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiBarItem {
  label: string;
  value: string | number;
  icon?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  location_on: MapPin,
  explore:     Compass,
  handshake:   Handshake,
  grid_view:   LayoutGrid,
  water:       Droplets,
};

export function FooterKpiBar({ items, className }: { items: KpiBarItem[]; className?: string }) {
  return (
    <footer
      className={cn(
        "z-40 flex h-16 items-center justify-between bg-secondary px-lg text-on-secondary",
        "shadow-[0_-4px_12px_rgba(0,0,0,0.1)]",
        className,
      )}
    >
      <div className="flex items-center gap-8 overflow-x-auto">
        {items.map((item) => {
          const Icon = item.icon ? ICON_MAP[item.icon] : undefined;
          return (
            <div key={item.label} className="flex items-center gap-3 whitespace-nowrap">
              {Icon && <Icon className="size-4 opacity-80" />}
              <div>
                <p className="font-bold leading-none">{item.value}</p>
                <p className="text-[10px] font-bold uppercase opacity-70">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="ml-8 flex items-center gap-6 whitespace-nowrap border-l border-on-secondary/20 pl-8">
        <p className="text-[11px] opacity-80">© 2026 Monitoreo Ambiental</p>
        <div className="flex gap-4">
          <a className="cursor-pointer text-[11px] font-bold transition-opacity hover:opacity-80 hover:underline" href="#">Soporte</a>
          <a className="cursor-pointer text-[11px] font-bold transition-opacity hover:opacity-80 hover:underline" href="#">Metadatos</a>
        </div>
      </div>
    </footer>
  );
}
