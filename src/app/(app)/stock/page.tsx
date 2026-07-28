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
    costPrice: item.costPrice.toNumber(),
    allergens: item.allergens ?? "",
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">
        Stock &amp; inventaire
      </h1>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Nouvel article</h2>
        <StockForm />
      </Card>

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold text-ink">Inventaire</h2>
          <span className="text-xs text-muted tabular-nums">{total} article(s)</span>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted">Aucun article pour le moment.</p>
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
                className="rounded-md px-3 py-1.5 font-medium text-ink hover:bg-card dark:text-muted"
              >
                ‹ Précédent
              </Link>
            ) : (
              <span className="px-3 py-1.5 text-muted dark:text-ink">‹ Précédent</span>
            )}
            <span className="text-muted tabular-nums">
              Page {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/stock?page=${page + 1}`}
                className="rounded-md px-3 py-1.5 font-medium text-ink hover:bg-card dark:text-muted"
              >
                Suivant ›
              </Link>
            ) : (
              <span className="px-3 py-1.5 text-muted dark:text-ink">Suivant ›</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
