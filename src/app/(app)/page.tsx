import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card, Badge } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (user.role === "ADMIN") {
    const [allStockItems, todayShiftsCount, employeeCount] = await Promise.all([
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
    ]);

    const lowStockItems = allStockItems.filter((item) => item.quantity <= item.minThreshold);

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Bonjour {user.name}
        </h1>

        <div className="grid gap-4 sm:grid-cols-3">
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
