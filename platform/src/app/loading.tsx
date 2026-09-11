// =============================================================================
// Loading skeleton global (Next.js App Router).
// Se muestra automáticamente mientras un Server Component hace fetch de datos.
// Apunta a evitar pantalla en blanco y dar feedback inmediato.
// =============================================================================

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {/* Top ribbon skeleton */}
      <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-container-lowest px-gutter py-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* Body: map + sidebar */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Map skeleton */}
        <div className="flex flex-1 flex-col gap-gutter overflow-y-auto bg-surface-container-low p-gutter">
          <div className="relative h-[400px] w-full flex-shrink-0 overflow-hidden rounded-xl border border-outline-variant bg-surface-variant shadow-sm lg:min-h-[560px] lg:flex-1">
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm">Cargando mapa y datos territoriales…</p>
              </div>
            </div>
          </div>

          {/* Bottom section skeleton */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>

        {/* Right panel skeleton */}
        <aside className="hidden w-[360px] flex-shrink-0 flex-col gap-3 overflow-y-auto border-l border-outline-variant bg-surface p-3 lg:flex">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </aside>
      </div>

      {/* Footer skeleton */}
      <div className="border-t border-outline-variant bg-surface-container-low px-gutter py-3">
        <div className="mx-auto flex max-w-screen-2xl gap-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}
