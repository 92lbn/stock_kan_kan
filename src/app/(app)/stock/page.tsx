import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { StockView, type StockItem } from "@/components/stock-view";
import { StockScan } from "@/components/stock-scan";

export default async function StockPage() {
  await requireAdmin();

  const [rawItems, valuation] = await Promise.all([
    db.stockItem.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    // Valorisation du stock (quantité × PMP) en SQL.
    db.$queryRaw<{ value: string | null }[]>`
      SELECT COALESCE(SUM(quantity * "costPrice"), 0) AS value
      FROM stock_items WHERE "deletedAt" IS NULL
    `,
  ]);
  const stockValue = valuation[0]?.value ?? 0;

  // Decimal n'est pas sérialisable vers un composant client : on ramène en Number.
  const items: StockItem[] = rawItems.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    quantity: item.quantity.toNumber(),
    minThreshold: item.minThreshold.toNumber(),
    costPrice: item.costPrice.toNumber(),
    allergens: item.allergens ?? "",
    barcode: item.barcode ?? "",
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Stock</h1>
          <p className="mt-0.5 text-sm text-muted">
            <span className="num">{items.length}</span> article(s) · valeur{" "}
            <span className="num font-medium text-ink">{formatEUR(stockValue)}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <StockScan />
          <Link href="/stock/mouvements" className="font-medium text-accent hover:underline">
            Historique
          </Link>
          <a href="/api/export/stock" className="font-medium text-accent hover:underline">
            Export CSV
          </a>
        </div>
      </div>

      <StockView items={items} />
    </div>
  );
}
