import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { StockForm } from "@/components/stock-form";
import { StockRow } from "@/components/stock-row";

export default async function StockPage() {
  await requireAdmin();

  const items = await db.stockItem.findMany({ orderBy: { name: "asc" } });

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
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Inventaire</h2>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun article pour le moment.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <StockRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
