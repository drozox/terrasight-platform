// =============================================================================
// Skeleton — UX-18
//
// Placeholder visual con pulse animation para estados de carga.
// `prefers-reduced-motion` desactiva la animación automáticamente vía globals.css.
// =============================================================================

import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-surface-container-high",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

// Bloques pre-armados para los estados de carga más comunes
export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

export function SkeletonSection() {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container p-6 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </section>
  );
}

export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container p-6 space-y-3">
      <Skeleton className="h-5 w-1/4" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
