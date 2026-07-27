import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { StockForm } from "@/components/stock-form";
import { StockList } from "@/components/stock-list";

export default async function StockPage() {
  await requireAdmin();

  const items = await db.stockItem.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-zinc-900">Stock &amp; inventaire</h1>

      <details className="rounded-lg border border-zinc-200 bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 font-medium text-zinc-900">
          + Ajouter un article
        </summary>
        <div className="border-t border-zinc-100 p-4">
          <StockForm />
        </div>
      </details>

      <StockList items={items} />
    </div>
  );
}
