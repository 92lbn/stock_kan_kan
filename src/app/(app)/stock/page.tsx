import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { StockForm } from "@/components/stock-form";
import { StockRow } from "@/components/stock-row";
import { StockFilters } from "@/components/stock-filters";
import { StockCategory } from "@/generated/prisma/enums";

const PAGE_SIZE = 24;

const ORDER_BY: Record<string, Prisma.StockItemOrderByWithRelationInput[]> = {
  name: [{ name: "asc" }],
  name_desc: [{ name: "desc" }],
  quantity: [{ quantity: "asc" }],
  low: [{ quantity: "asc" }, { name: "asc" }],
};

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; cat?: string; sort?: string }>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim() ?? "";
  const cat = sp.cat && sp.cat in StockCategory ? (sp.cat as StockCategory) : undefined;
  const sort = sp.sort && sp.sort in ORDER_BY ? sp.sort : "name";

  const where: Prisma.StockItemWhereInput = {
    deletedAt: null,
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(cat ? { category: cat } : {}),
  };
  const [rawItems, total, valuation] = await Promise.all([
    db.stockItem.findMany({
      where,
      orderBy: ORDER_BY[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.stockItem.count({ where }),
    // Valorisation du stock : combien d'euros dorment en réserve (quantité × PMP).
    db.$queryRaw<{ value: string | null }[]>`
      SELECT COALESCE(SUM(quantity * "costPrice"), 0) AS value
      FROM stock_items WHERE "deletedAt" IS NULL
    `,
  ]);
  const stockValue = valuation[0]?.value ?? 0;

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

  // Conserve recherche/filtre/tri dans les liens de pagination.
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat) params.set("cat", cat);
    if (sort !== "name") params.set("sort", sort);
    params.set("page", String(p));
    return `/stock?${params}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">Stock &amp; inventaire</h1>
        <div className="flex items-center gap-4">
          <Link href="/stock/mouvements" className="text-sm font-medium text-accent underline">
            Historique
          </Link>
          <a href="/api/export/stock" className="text-sm font-medium text-accent underline">
            Export CSV
          </a>
          <div className="text-right">
            <p className="kpi-label">Valeur du stock</p>
            <p className="num text-2xl font-semibold text-ink">{formatEUR(stockValue)}</p>
          </div>
        </div>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Nouvel article</h2>
        <StockForm />
      </Card>

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold text-ink">Inventaire</h2>
          <span className="text-xs text-muted tabular-nums">{total} article(s)</span>
        </div>
        <div className="mb-3">
          <StockFilters q={q} cat={cat ?? ""} sort={sort} />
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted">Aucun article ne correspond.</p>
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
                href={pageHref(page - 1)}
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
                href={pageHref(page + 1)}
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
