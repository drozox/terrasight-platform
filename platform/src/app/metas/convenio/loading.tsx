// Skeleton para /metas/convenio (carga KPIs + municipios + veredas)
import { Skeleton, SkeletonSection } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </header>
        <section className="rounded-xl border border-outline-variant bg-surface-container p-6 space-y-3">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-8 w-1/5" />
          </div>
          <Skeleton className="h-3 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
        </section>
        <SkeletonSection />
        <SkeletonSection />
        <SkeletonSection />
      </div>
    </main>
  );
}
