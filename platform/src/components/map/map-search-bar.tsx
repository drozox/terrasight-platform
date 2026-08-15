"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Layers, Bookmark, Box, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { View3DDialog } from "./view-3d-dialog";

export function MapSearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState(initialQuery);
  // UX-29 (audit 2026-07-24): feedback visual durante el debounce de 300ms.
  // Antes el usuario tipeaba y la URL se actualizaba silenciosamente — sin
  // pista de que algo estaba pasando. Ahora un Loader2 aparece al lado del
  // search mientras esperamos el router.replace. Se va apenas termina.
  const [searching, setSearching] = React.useState(false);
  // Antes el boton 3D era solo decorativo (disabled). Ahora abre un dialog
  // con mockup visual + features list + CTA de feedback (View3DDialog).
  const [view3DOpen, setView3DOpen] = React.useState(false);

  // Debounce: actualiza la URL 300ms después de dejar de tipear
  React.useEffect(() => {
    if (q === initialQuery) {
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      router.replace(`/?${params.toString()}`, { scroll: false });
      setSearching(false);
    }, 300);
    return () => {
      clearTimeout(t);
      setSearching(false);
    };
  }, [q, initialQuery, router]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="pointer-events-none absolute left-4 right-4 top-4 z-[600] flex justify-center">
      <form
        onSubmit={onSubmit}
        className="pointer-events-auto flex w-full max-w-2xl items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest/95 px-4 py-2 shadow-xl backdrop-blur"
      >
        {/* UX-29: el icono Search cambia a Loader2 durante el debounce. */}
        {searching ? (
          <Loader2
            className="size-4 shrink-0 animate-spin text-primary"
            aria-label="Buscando"
          />
        ) : (
          <Search className="size-4 shrink-0 text-on-surface-variant" />
        )}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full border-none bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/80"
          placeholder="Buscar municipio, vereda o predio…"
          aria-label="Buscar en el mapa"
        />
        {/* El botón 3D ya NO es disabled: abre un dialog "Coming soon" con
           mockup visual del territorio + lista de features + CTA de
           feedback. Asi el usuario entiende qué viene y puede votar. */}
        <button
          type="button"
          onClick={() => setView3DOpen(true)}
          title="Ver vista 3D (próximamente)"
          aria-label="Ver vista 3D — próxima fase"
          className="flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 text-label-md font-bold text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-primary"
        >
          <Box className="size-3.5" /> 3D · pronto
        </button>
        <button
          type="button"
          aria-label="Capas"
          title="Capas del mapa"
          className="flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-primary"
        >
          <Layers className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Marcadores guardados"
          title="Marcadores guardados"
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant",
            "transition-colors hover:bg-surface-variant hover:text-primary",
          )}
        >
          <Bookmark className="size-4" />
        </button>
      </form>

      <View3DDialog open={view3DOpen} onOpenChange={setView3DOpen} />
    </div>
  );
}