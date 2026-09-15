"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Layers } from "lucide-react";
import { IconLeaf, IconDrop, IconForest, IconUpload } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { AvanceComponente, ComponenteKey } from "@/lib/repos";

type Key = ComponenteKey | "TODOS" | "IMPORT";

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
  TODOS: {
    label: "TODOS",
    desc: "Vista consolidada de los tres componentes del convenio",
    Icon: Layers,
    bgClass:     "bg-on-surface/10",
    textClass:   "text-on-surface",
    ringClass:   "ring-on-surface",
    borderClass: "bg-on-surface",
    pillClass:   "bg-on-surface text-surface",
  },
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

const ORDER: Key[] = ["TODOS", "C1", "C2", "C3", "IMPORT"];

export function ComponentRibbon({
  active,
  avances,
}: {
  active?: string | null;
  avances?: Record<ComponenteKey, AvanceComponente>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onSelect = (key: Key) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "TODOS" || active === key) {
      params.delete("componente");
    } else {
      params.set("componente", key);
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  };

  return (
    <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-5">
      {ORDER.map((k) => {
        const c = CONFIG[k];
        const isActive = k === "TODOS" ? !active || active === "TODOS" : active === k;
        const av = k !== "TODOS" && k !== "IMPORT" ? avances?.[k] : undefined;
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
                  "flex h-12 w-12 items-center justify-center rounded-lg transition-transform",
                  c.bgClass,
                  c.textClass,
                  "transform-gpu group-hover:scale-110",
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

                {av && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-variant/50">
                      <div
                        className={cn("h-full", c.borderClass)}
                        style={{ width: `${av.pct}%` }}
                      />
                    </div>
                    <span className={cn("text-[10px] font-bold", c.textClass)}>
                      {av.pct}%
                    </span>
                  </div>
                )}
                {av && (
                  <p className="mt-0.5 text-[10px] text-on-surface-variant">
                    {av.cumplidas}/{av.total} metas cumplidas
                  </p>
                )}

                {k !== "TODOS" && k !== "IMPORT" && (
                  <Link
                    href={`/intervenciones?componente=${k}`}
                    aria-label={`Ver intervenciones de ${c.label}`}
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 text-[11px] font-bold opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest",
                      c.textClass,
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver intervenciones
                    <ArrowRight className="size-3" />
                  </Link>
                )}
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
