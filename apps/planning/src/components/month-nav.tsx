import Link from "next/link";
import { formatMonthFR } from "@stock-kan-kan/lib/date";

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
        className="rounded-md border border-line px-2 py-1 text-sm text-muted hover:bg-card dark:text-muted"
      >
        ‹
      </Link>
      <span className="min-w-36 text-center text-sm font-medium capitalize text-ink">
        {formatMonthFR(month)}
      </span>
      <Link
        href={`${basePath}?mois=${shiftMonth(month, 1)}`}
        aria-label="Mois suivant"
        className="rounded-md border border-line px-2 py-1 text-sm text-muted hover:bg-card dark:text-muted"
      >
        ›
      </Link>
    </div>
  );
}
