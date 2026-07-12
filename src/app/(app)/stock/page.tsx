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

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Inventaire</h2>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun article pour le moment.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
                <th className="pb-2 font-medium">Article</th>
                <th className="pb-2 font-medium">Quantité</th>
                <th className="pb-2 font-medium">Mouvement</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <StockRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
