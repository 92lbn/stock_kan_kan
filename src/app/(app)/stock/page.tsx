import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { StockForm } from "@/components/stock-form";
import { StockRow } from "@/components/stock-row";

const PAGE_SIZE = 24;

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where = { deletedAt: null };
  const [rawItems, total] = await Promise.all([
    db.stockItem.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.stockItem.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Decimal n'est pas sérialisable vers un composant client : on ramène en Number.
  const items = rawItems.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    quantity: item.quantity.toNumber(),
    minThreshold: item.minThreshold.toNumber(),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Stock &amp; inventaire
      </h1>

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Nouvel article</h2>
        <StockForm />
      </Card>

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Inventaire</h2>
          <span className="text-xs text-zinc-500 tabular-nums">{total} article(s)</span>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun article pour le moment.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <StockRow key={item.id} item={item} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            {page > 1 ? (
              <Link
                href={`/stock?page=${page - 1}`}
                className="rounded-md px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                ‹ Précédent
              </Link>
            ) : (
              <span className="px-3 py-1.5 text-zinc-300 dark:text-zinc-700">‹ Précédent</span>
            )}
            <span className="text-zinc-500 tabular-nums">
              Page {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/stock?page=${page + 1}`}
                className="rounded-md px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Suivant ›
              </Link>
            ) : (
              <span className="px-3 py-1.5 text-zinc-300 dark:text-zinc-700">Suivant ›</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
