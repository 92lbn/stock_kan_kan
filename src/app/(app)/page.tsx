import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card, Badge } from "@/components/ui/card";
import { DueRemindersBanner } from "@/components/due-reminders-banner";

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

// Notes with a reminder that is due now or earlier, still to do.
async function getDueReminders(userId: string) {
  return db.note.findMany({
    where: { authorId: userId, done: false, remindAt: { not: null, lte: new Date() } },
    orderBy: { remindAt: "asc" },
  });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const dueReminders = await getDueReminders(user.id);

  if (user.role === "ADMIN") {
    const { start, end } = monthRange();
    const [allStockItems, todayShiftsCount, employeeCount, ledgerEntries] = await Promise.all([
      db.stockItem.findMany({ orderBy: { name: "asc" } }),
      db.shift.count({
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(24, 0, 0, 0)),
          },
        },
      }),
      db.user.count({ where: { role: "EMPLOYEE" } }),
      db.ledgerEntry.findMany({ where: { date: { gte: start, lt: end } } }),
    ]);

    const lowStockItems = allStockItems.filter((item) => item.quantity <= item.minThreshold);
    const net = ledgerEntries.reduce(
      (sum, e) => sum + (e.type === "REVENUE" ? e.amount : -e.amount),
      0
    );

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Bonjour {user.name}
        </h1>

        <DueRemindersBanner notes={dueReminders} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-sm text-zinc-500">Alertes de stock</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {lowStockItems.length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-zinc-500">Créneaux aujourd&apos;hui</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {todayShiftsCount}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-zinc-500">Employés</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {employeeCount}
            </p>
          </Card>
          <Link href="/comptabilite">
            <Card className="transition-colors hover:border-zinc-400 dark:hover:border-zinc-600">
              <p className="text-sm text-zinc-500">Solde du mois</p>
              <p
                className={`mt-1 text-2xl font-semibold ${net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {net >= 0 ? "+" : ""}
                {net.toFixed(0)} €
              </p>
            </Card>
          </Link>
        </div>

        {lowStockItems.length > 0 && (
          <Card>
            <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
              Produits à réapprovisionner
            </h2>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {lowStockItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">{item.name}</span>
                  <Badge variant="warning">
                    {item.quantity} / {item.minThreshold} {item.unit}
                  </Badge>
                </li>
              ))}
            </ul>
            <Link href="/stock" className="mt-3 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100">
              Voir le stock →
            </Link>
          </Card>
        )}
      </div>
    );
  }

  const upcomingShifts = await db.shift.findMany({
    where: { employeeId: user.id, date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    orderBy: { date: "asc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Bonjour {user.name}
      </h1>

      <DueRemindersBanner notes={dueReminders} />

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
          Vos prochains créneaux
        </h2>
        {upcomingShifts.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun créneau à venir.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {upcomingShifts.map((shift) => (
              <li key={shift.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">
                  {shift.date.toLocaleDateString("fr-FR")}
                </span>
                <span className="text-zinc-500">
                  {shift.startTime} – {shift.endTime}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/pointage" className="mt-3 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100">
          Pointer mon arrivée / départ →
        </Link>
      </Card>
    </div>
  );
}
