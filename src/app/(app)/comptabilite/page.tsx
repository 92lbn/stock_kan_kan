import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LedgerForm } from "@/components/ledger-form";
import { DailyNetChart } from "@/components/daily-net-chart";
import { deleteLedgerEntry } from "@/lib/actions/ledger";

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export default async function ComptabilitePage() {
  await requireAdmin();
  const { start, end } = monthRange();

  const entries = await db.ledgerEntry.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { date: "desc" },
  });

  const totalRevenue = entries
    .filter((e) => e.type === "REVENUE")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = entries
    .filter((e) => e.type === "EXPENSE")
    .reduce((sum, e) => sum + e.amount, 0);
  const net = totalRevenue - totalExpense;

  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const netByDay = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, net: 0 }));
  for (const entry of entries) {
    const day = entry.date.getUTCDate();
    const signed = entry.type === "REVENUE" ? entry.amount : -entry.amount;
    if (netByDay[day - 1]) netByDay[day - 1].net += signed;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Recettes &amp; dépenses
      </h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-zinc-500">Recettes du mois</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            +{totalRevenue.toFixed(0)} €
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Dépenses du mois</p>
          <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
            -{totalExpense.toFixed(0)} €
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Solde net</p>
          <p
            className={`mt-1 text-2xl font-semibold ${net >= 0 ? "text-zinc-900 dark:text-zinc-100" : "text-red-600 dark:text-red-400"}`}
          >
            {net >= 0 ? "+" : ""}
            {net.toFixed(0)} €
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
          Solde net par jour
        </h2>
        <DailyNetChart data={netByDay} />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Nouvelle entrée</h2>
        <LedgerForm />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
          Entrées du mois
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune entrée ce mois-ci.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Catégorie</th>
                <th className="pb-2 font-medium">Montant</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="py-2 text-zinc-500">
                    {entry.date.toLocaleDateString("fr-FR", { timeZone: "UTC" })}
                  </td>
                  <td className="py-2 text-zinc-700 dark:text-zinc-300">
                    {entry.type === "REVENUE" ? "Recette" : "Dépense"}
                  </td>
                  <td className="py-2 text-zinc-500">{entry.category ?? "—"}</td>
                  <td
                    className={
                      entry.type === "REVENUE"
                        ? "py-2 text-emerald-600 dark:text-emerald-400"
                        : "py-2 text-red-600 dark:text-red-400"
                    }
                  >
                    {entry.type === "REVENUE" ? "+" : "-"}
                    {entry.amount.toFixed(2)} €
                  </td>
                  <td className="py-2 text-right">
                    <form action={deleteLedgerEntry.bind(null, entry.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        Supprimer
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}
