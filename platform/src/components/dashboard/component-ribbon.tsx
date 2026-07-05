"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconLeaf, IconDrop, IconForest, IconUpload } from "@/components/icons";
import { cn } from "@/lib/utils";

type Key = "C1" | "C2" | "C3" | "IMPORT";

const CONFIG: Record<Key, {
  label: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
  bgClass: string;
  textClass: string;
  ringClass: string;
  borderClass: string;
  pillClass: string;
}> = {
  C1: {
    label: "COMPONENTE 1",
    desc: "Conservación del recurso hídrico y adaptación al cambio climático",
    Icon: IconLeaf,
    bgClass:      "bg-primary/10",
    textClass:    "text-primary",
    ringClass:    "ring-primary",
    borderClass:  "bg-primary",
    pillClass:    "bg-primary text-on-primary",
  },
  C2: {
    label: "COMPONENTE 2",
    desc: "Manejo integral del ciclo del agua y restauración de suelos",
    Icon: IconDrop,
    bgClass:      "bg-secondary/10",
    textClass:    "text-secondary",
    ringClass:    "ring-secondary",
    borderClass:  "bg-secondary",
    pillClass:    "bg-secondary text-on-secondary",
  },
  C3: {
    label: "COMPONENTE 3",
    desc: "Planificación predial participativa y reconversión productiva",
    Icon: IconForest,
    bgClass:      "bg-tertiary/10",
    textClass:    "text-tertiary",
    ringClass:    "ring-tertiary",
    borderClass:  "bg-tertiary",
    pillClass:    "bg-tertiary text-on-tertiary",
  },
  IMPORT: {
    label: "IMPORTAR CAPA",
    desc: "Carga GeoJSON o Shapefile para crear propuestas de acciones en lote",
    Icon: IconUpload,
    bgClass:      "bg-inverse-surface/10",
    textClass:    "text-inverse-surface",
    ringClass:    "ring-inverse-surface",
    borderClass:  "bg-inverse-surface",
    pillClass:    "bg-inverse-surface text-inverse-on-surface",
  },
};

const ORDER: Key[] = ["C1", "C2", "C3", "IMPORT"];

export function ComponentRibbon({ active }: { active?: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onSelect = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (active === key) {
      params.delete("componente");
    } else {
      params.set("componente", key);
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  };

  return (
    <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
      {ORDER.map((k) => {
        const c = CONFIG[k];
        const isActive = active === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onSelect(k)}
            aria-pressed={isActive}
            className={cn(
              "group relative cursor-pointer overflow-hidden rounded-xl border p-4 text-left",
              "bg-surface-container-lowest shadow-[0px_4px_12px_rgba(0,0,0,0.03)]",
              "transition-all hover:shadow-md",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low",
              isActive
                ? `border-transparent ring-2 ${c.ringClass}`
                : "border-outline-variant hover:border-outline",
            )}
          >
            <div
              className={cn("absolute inset-y-0 left-0 w-1.5", c.borderClass)}
              aria-hidden
            />
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-lg transition-all",
                  c.bgClass,
                  c.textClass,
                  "group-hover:scale-110",
                  isActive && "scale-110",
                )}
              >
                <c.Icon className="size-8" />
              </div>
              <div className="flex-1">
                <h3 className={cn("mb-0.5 text-label-lg font-bold", c.textClass)}>
                  {c.label}
                </h3>
                <p className="line-clamp-2 text-body-sm text-on-surface-variant">
                  {c.desc}
                </p>
              </div>
              {isActive && (
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    c.pillClass,
                  )}
                  aria-hidden
                >
                  ✓
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}