"use client";

// =============================================================================
// TopbarSearch — UX-61 (audit 2026-07-24) búsqueda global con dropdown
//
// UX-61: el topbar tenía un placeholder "Buscar en SIG TERRITORIO..." que
// no hacía nada. Ahora conecta a /api/search y muestra hasta 25 resultados
// de 5 tablas (predios, propuestas, municipios, veredas, propietarios)
// con íconos semánticos y navegación directa.
//
// Performance: debounce 250ms para no spammear la API mientras el usuario
// escribe. Aborta requests en vuelo si el query cambia (AbortController).
// =============================================================================

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search as SearchIcon,
  Building2,
  Wrench,
  Landmark,
  Home,
  User,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  tipo: "predio" | "propuesta" | "municipio" | "vereda" | "propietario";
  id: number;
  label: string;
  sublabel?: string;
  href: string;
  score: number;
}

const ICON_MAP: Record<SearchResult["tipo"], React.ComponentType<{ className?: string }>> = {
  predio: Building2,
  propuesta: Wrench,
  municipio: Landmark,
  vereda: Home,
  propietario: User,
};

const TIPO_LABEL: Record<SearchResult["tipo"], string> = {
  predio: "Predio",
  propuesta: "Propuesta",
  municipio: "Municipio",
  vereda: "Vereda",
  propietario: "Propietario",
};

export function TopbarSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Debounced search
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const r = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          setError(data.error || "Error");
          setIsLoading(false);
          return;
        }
        const data = await r.json();
        setResults(data.results as SearchResult[]);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Keyboard shortcut: Ctrl+K / Cmd+K para enfocar
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <div className="relative w-full max-w-md">
      <div
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg border bg-surface-container-lowest px-3 transition-colors",
          isOpen ? "border-primary" : "border-outline-variant",
        )}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin text-on-surface-variant" aria-hidden="true" />
        ) : (
          <SearchIcon className="size-4 text-on-surface-variant" aria-hidden="true" />
        )}
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="Buscar predios, propuestas, municipios… (Ctrl+K)"
          aria-label="Búsqueda global"
          className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              inputRef.current?.focus();
            }}
            aria-label="Limpiar búsqueda"
            className="rounded p-0.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            <X className="size-3.5" />
          </button>
        )}
        <kbd className="hidden md:inline-block rounded border border-outline-variant/60 bg-surface-container px-1 text-[10px] font-mono text-on-surface-variant">
          ⌘K
        </kbd>
      </div>

      {isOpen && (query.length >= 2 || results.length > 0 || error) && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-[1000] mt-1 max-h-96 overflow-y-auto rounded-lg border border-outline-variant/50 bg-surface-container-lowest shadow-2xl"
        >
          {error && (
            <div className="p-3 text-xs text-error" role="alert">
              {error}
            </div>
          )}

          {!error && !isLoading && results.length === 0 && query.length >= 2 && (
            <div className="p-3 text-xs text-on-surface-variant">
              Sin resultados para &quot;{query}&quot;
            </div>
          )}

          {!error && results.length > 0 && (
            <ul className="divide-y divide-outline-variant/30 py-1">
              {results.map((r) => {
                const Icon = ICON_MAP[r.tipo];
                return (
                  <li key={`${r.tipo}-${r.id}`}>
                    <Link
                      href={r.href}
                      onClick={() => {
                        setIsOpen(false);
                        setQuery("");
                      }}
                      onMouseDown={(e) => e.preventDefault()} // evita blur antes del click
                      className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-surface-container"
                    >
                      <Icon className="size-4 text-on-surface-variant flex-shrink-0" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-on-surface">{r.label}</div>
                        {r.sublabel && (
                          <div className="truncate text-[11px] text-on-surface-variant">{r.sublabel}</div>
                        )}
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-on-surface-variant flex-shrink-0">
                        {TIPO_LABEL[r.tipo]}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
