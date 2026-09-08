// Skeleton para /metas/convenio/propuestas
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-5 w-1/3" />
        <header className="space-y-2">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
        </header>
        <SkeletonTable rows={10} />
      </div>
    </main>
  );
}
