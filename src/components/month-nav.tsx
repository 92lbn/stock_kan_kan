import Link from "next/link";
import { formatMonthFR } from "@/lib/date";

const pad = (n: number) => String(n).padStart(2, "0");

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

// Sélecteur de mois (‹ mois ›) piloté par l'URL (?mois=YYYY-MM), sans état client.
export function MonthNav({ month, basePath }: { month: string; basePath: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`${basePath}?mois=${shiftMonth(month, -1)}`}
        aria-label="Mois précédent"
        className="rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        ‹
      </Link>
      <span className="min-w-36 text-center text-sm font-medium capitalize text-zinc-900 dark:text-zinc-100">
        {formatMonthFR(month)}
      </span>
      <Link
        href={`${basePath}?mois=${shiftMonth(month, 1)}`}
        aria-label="Mois suivant"
        className="rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        ›
      </Link>
    </div>
  );
}
