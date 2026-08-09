import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-card-2", className)} aria-hidden />;
}

// Rangée de cartes de statistiques (dashboard, compta).
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${Math.min(count, 4)}, minmax(0, 1fr))` }}
      role="status"
      aria-label="Chargement…"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-line bg-card p-4 shadow-sm">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="mt-2 h-7 w-1/2" />
        </div>
      ))}
    </div>
  );
}

// Liste (stock, employés, entrées compta, publications…).
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-line bg-card shadow-sm"
      role="status"
      aria-label="Chargement…"
    >
      {Array.from({ length: rows }).map((_, i) => (
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
  );
}

// Squelette générique par défaut (barre de recherche + liste).
export function PageSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-11 w-full" />
      <ListSkeleton rows={6} />
    </div>
  );
}
