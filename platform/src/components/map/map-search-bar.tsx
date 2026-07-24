"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Layers, Bookmark, Box } from "lucide-react";

export function MapSearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState(initialQuery);

  // Debounce: actualiza la URL 300ms después de dejar de tipear
  React.useEffect(() => {
    if (q === initialQuery) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      router.replace(`/?${params.toString()}`, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
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
        <Search className="size-4 shrink-0 text-on-surface-variant" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full border-none bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/60"
          placeholder="Buscar municipio, vereda o predio…"
          aria-label="Buscar en el mapa"
        />
        {/* UX-27/UX-57: el botón 3D es no-funcional (próximamente). Antes era
           clickeable y tenía hover state — engañaba al usuario. Ahora está
           disabled con label visible "3D · pronto" y cursor-not-allowed. */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Vista 3D — próxima fase"
          className="flex cursor-not-allowed items-center gap-1 rounded-full bg-surface-container px-3 py-1 text-label-md font-bold text-on-surface-variant/60"
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
          className="flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-primary"
        >
          <Bookmark className="size-4" />
        </button>
      </form>
    </div>
  );
}