import { Suspense } from "react";
import Link from "next/link";
import { requireStockAccess } from "@stock-kan-kan/auth/dal";
import { db } from "@stock-kan-kan/db";
import { Prisma } from "@stock-kan-kan/db/client";
import { dayRange, toYmd } from "@stock-kan-kan/lib/date";
import { formatEUR } from "@stock-kan-kan/lib/money";
import { StockView, type StockItem } from "@/components/stock-view";
import { StockScan } from "@/components/stock-scan";
import { Skeleton, ListSkeleton } from "@stock-kan-kan/ui/skeleton";

// Shell instantané : titre + actions statiques. Seul l'inventaire est en <Suspense>.
export default function StockPage() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">Stock</h1>
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

      <Suspense fallback={<StockSkeleton />}>
        <StockContent />
      </Suspense>
    </div>
  );
}

function StockSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-11 w-full" />
      <ListSkeleton rows={7} />
    </div>
  );
}

async function StockContent() {
  await requireStockAccess();

  const [rawItems, valuation] = await Promise.all([
    db.stockItem.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        unit: true,
        minThreshold: true,
        costPrice: true,
        allergens: true,
        barcode: true,
        imageMimeType: true,
        updatedAt: true,
        lots: { where: { quantity: { gt: 0 } }, orderBy: { expiryDate: "asc" } },
      },
    }),
    // Valorisation du stock (quantité × PMP) en SQL.
    db.$queryRaw<{ value: string | null }[]>`
      SELECT COALESCE(SUM(l.quantity * i."costPrice"), 0) AS value
      FROM stock_lots l JOIN stock_items i ON i.id = l."stockItemId"
      WHERE i."deletedAt" IS NULL AND l.quantity > 0
    `,
  ]);
  const stockValue = valuation[0]?.value ?? 0;

  // Decimal traverse la frontière serveur/client sous forme de chaîne exacte.
  const items: StockItem[] = rawItems.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    quantity: item.lots.reduce((sum, lot) => sum.plus(lot.quantity), new Prisma.Decimal(0)).toString(),
    minThreshold: item.minThreshold.toString(),
    costPrice: item.costPrice.toString(),
    allergens: item.allergens ?? "",
    barcode: item.barcode ?? "",
    hasImage: Boolean(item.imageMimeType),
    imageVersion: item.updatedAt.getTime().toString(),
    lots: item.lots.map((lot) => ({
      id: lot.id,
      lotNumber: lot.lotNumber ?? "",
      expiryDate: lot.expiryDate.toISOString().slice(0, 10),
      quantity: lot.quantity.toString(),
    })),
  }));

  return (
    <>
      <p className="text-sm text-muted">
        <span className="num">{items.length}</span> article(s) · valeur{" "}
        <span className="num font-medium text-ink">{formatEUR(stockValue)}</span>
      </p>
      <StockView items={items} today={toYmd(dayRange().start)} />
    </>
  );
}
