"use client";

import * as React from "react";
import { Info } from "lucide-react";
import type { ComponenteTotal } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  C1: "var(--color-primary)",
  C2: "var(--color-secondary)",
  C3: "var(--color-tertiary)",
};

export function MapLegend({
  componentes,
  className,
}: {
  componentes: ComponenteTotal[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute right-4 bottom-4 z-[600] max-w-xs rounded-xl border border-outline-variant/40 bg-surface-container-lowest/95 p-3 shadow-xl backdrop-blur",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-label-lg font-bold uppercase text-on-surface-variant">
        <Info className="size-3.5" />
        Leyenda
      </div>
      <ul className="space-y-1.5 text-body-sm">
        {componentes.map((c) => (
          <li key={c.nombre} className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full ring-2 ring-surface-container-lowest"
              style={{ background: COLORS[c.nombre] }}
            />
            <span className="flex-1 text-on-surface">{c.nombre}</span>
            <span className="font-bold text-on-surface-variant">
              {c.total}
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2 border-t border-outline-variant/30 pt-1.5">
          <span
            className="size-3 shrink-0 rounded-full ring-2 ring-surface-container-lowest"
            style={{ background: "var(--color-secondary)" }}
          />
          <span className="flex-1 text-on-surface">Fuente hídrica</span>
        </li>
      </ul>
    </div>
  );
}