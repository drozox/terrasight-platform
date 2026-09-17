"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";
import { IconLeaf, IconDrop, IconForest, IconUpload } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { ComponenteKey } from "@/lib/repos";
import { accionesDeComponente, normalizarAccion, type AccionCode } from "@/lib/acciones";

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

const ORDER: Key[] = ["TODOS", "C1", "C2", "C3"];

export function ComponentRibbon({
  active,
  activeAccion,
}: {
  active?: string | null;
  activeAccion?: AccionCode | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onSelect = (key: Key) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "TODOS" || active === key) {
      params.delete("componente");
      params.delete("accion");
    } else {
      params.set("componente", key);
      params.delete("accion"); // limpiar sub-filtro al cambiar de componente
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  };

  const acciones =
    active && active !== "TODOS" && active !== "IMPORT"
      ? accionesDeComponente(active)
      : [];
  const activaCode = normalizarAccion(activeAccion ?? null);

  const onSelectAccion = (code: AccionCode | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!code || activaCode === code) params.delete("accion");
    else params.set("accion", code);
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ORDER.map((k) => {
        const c = CONFIG[k];
        const isActive = k === "TODOS" ? !active || active === "TODOS" : active === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onSelect(k)}
            aria-pressed={isActive}
            className={cn(
              "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[20px] border p-6 text-left",
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
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform",
                  c.bgClass,
                  c.textClass,
                  "transform-gpu group-hover:scale-110",
                  isActive && "scale-110",
                )}
              >
                <c.Icon className="size-6" />
              </div>
              <div className="flex-1">
                <h3 className={cn("mb-1 text-[15px] font-semibold", c.textClass)}>
                  {c.label}
                </h3>
                <p className="line-clamp-2 text-[13px] leading-snug text-on-surface-variant">
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

      {acciones.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pl-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
            Acción:
          </span>
          <button
            type="button"
            onClick={() => onSelectAccion(null)}
            aria-pressed={!activaCode}
            className={cn(
              "rounded-full border px-3 py-0.5 text-[11px] font-bold transition-colors",
              !activaCode
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant",
            )}
          >
            Todas
          </button>
          {acciones.map((a) => (
            <button
              key={a.code}
              type="button"
              onClick={() => onSelectAccion(a.code)}
              aria-pressed={activaCode === a.code}
              className={cn(
                "rounded-full border px-3 py-0.5 text-[11px] font-bold transition-colors",
                activaCode === a.code
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant",
              )}
            >
              {a.code}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
