import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-card-2", className)} aria-hidden />;
}

// Squelette neutre affiché instantanément pendant le chargement d'une page
// (titre + quelques lignes de liste) — la forme colle à la plupart des écrans.
export function PageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Chargement…">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-11 w-full" />
      <div className="overflow-hidden rounded-xl border border-line bg-card">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
