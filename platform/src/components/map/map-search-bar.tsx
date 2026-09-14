"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

export function MapSearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState(initialQuery);
  // UX-29 (audit 2026-07-24): feedback visual durante el debounce de 300ms.
  const [searching, setSearching] = React.useState(false);

  // Debounce: actualiza la URL 300ms después de dejar de tipear.
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
      </form>
    </div>
  );
}
