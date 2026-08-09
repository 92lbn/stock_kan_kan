import { Suspense } from "react";
import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatEUR, formatQuantity } from "@/lib/money";
import { monthRange, dayRange, formatDateFR } from "@/lib/date";
import { Card, Badge } from "@/components/ui/card";
import { Skeleton, StatCardsSkeleton, ListSkeleton } from "@/components/ui/skeleton";
import { DueRemindersBanner } from "@/components/due-reminders-banner";

// Notes with a reminder that is due now or earlier, still to do.
async function getDueReminders(userId: string) {
  return db.note.findMany({
    where: { authorId: userId, done: false, remindAt: { not: null, lte: new Date() } },
    orderBy: { remindAt: "asc" },
  });
}

// Shell instantané : seule la zone de données est en <Suspense>. Le layout (nav)
// reste visible, le contenu précédent est conservé jusqu'à l'arrivée du nouveau.
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <StatCardsSkeleton count={4} />
      <ListSkeleton rows={4} />
    </div>
  );
}

async function DashboardContent() {
  const user = await getCurrentUser(); // vague 1 : auth (cache React, 1 requête)

  if (user.role === "ADMIN") {
    const { start, end } = monthRange();
    // Vague 2 : toutes les données en parallèle (rappels inclus, plus en cascade).
    const [dueReminders, lowStockItems, todayShiftsCount, employeeCount, ledgerAgg] =
      await Promise.all([
        getDueReminders(user.id),
        db.$queryRaw<
          { id: string; name: string; quantity: string; minThreshold: string; unit: string }[]
        >`
          SELECT id, name, quantity, "minThreshold", unit
          FROM stock_items
          WHERE "deletedAt" IS NULL AND "minThreshold" > 0 AND quantity <= "minThreshold"
          ORDER BY name ASC
        `,
        db.shift.count({ where: { date: { gte: dayRange().start, lt: dayRange().end } } }),
        db.user.count({ where: { role: "EMPLOYEE", deletedAt: null } }),
        db.ledgerEntry.groupBy({
          by: ["type"],
          where: { date: { gte: start, lt: end }, deletedAt: null },
          _sum: { amount: true },
        }),
      ]);

    const revenue =
      ledgerAgg.find((g) => g.type === "REVENUE")?._sum.amount ?? new Prisma.Decimal(0);
    const expense =
      ledgerAgg.find((g) => g.type === "EXPENSE")?._sum.amount ?? new Prisma.Decimal(0);
    const net = revenue.minus(expense);

    return (
      <>
        <h1 className="text-2xl font-semibold text-ink">Bonjour {user.name}</h1>

        <DueRemindersBanner notes={dueReminders} />

        {lowStockItems.length > 0 && (
          <Link
            href="/stock"
            className="flex items-center justify-between gap-3 rounded-xl bg-warning px-5 py-4 text-white shadow-sm"
          >
            <span>
              <span className="kpi-label !text-white/85">À réapprovisionner</span>
              <span className="mt-0.5 block text-lg font-medium">
                <span className="num text-2xl">{lowStockItems.length}</span> article(s) sous le seuil
              </span>
            </span>
            <span aria-hidden className="text-2xl">→</span>
          </Link>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="kpi-label">Alertes de stock</p>
            <p className="num mt-1 text-5xl font-semibold text-ink">{lowStockItems.length}</p>
          </Card>
          <Card>
            <p className="kpi-label">Créneaux aujourd&apos;hui</p>
            <p className="num mt-1 text-5xl font-semibold text-ink">{todayShiftsCount}</p>
          </Card>
          <Card>
            <p className="kpi-label">Employés</p>
            <p className="num mt-1 text-5xl font-semibold text-ink">{employeeCount}</p>
          </Card>
          <Link href="/comptabilite">
            <Card className="transition-colors hover:border-ink">
              <p className="kpi-label">Solde du mois</p>
              <p
                className={`num mt-1 text-4xl font-semibold ${net.gte(0) ? "text-positive" : "text-danger"}`}
              >
                {net.gte(0) ? "+" : ""}
                {formatEUR(net)}
              </p>
            </Card>
          </Link>
        </div>

        {lowStockItems.length > 0 && (
          <Card>
            <h2 className="mb-3 font-semibold text-ink">Produits à réapprovisionner</h2>
            <ul className="divide-y divide-line">
              {lowStockItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-ink">{item.name}</span>
                  <Badge variant="warning">
                    <span className="num">
                      {formatQuantity(item.quantity)} / {formatQuantity(item.minThreshold)}
                    </span>{" "}
                    {item.unit}
                  </Badge>
                </li>
              ))}
            </ul>
            <Link href="/stock" className="mt-3 inline-block text-sm font-medium text-accent underline">
              Voir le stock →
            </Link>
          </Card>
        )}
      </>
    );
  }

  // Employé : vague 2 en parallèle (rappels + prochains créneaux).
  const [dueReminders, upcomingShifts] = await Promise.all([
    getDueReminders(user.id),
    db.shift.findMany({
      where: { employeeId: user.id, date: { gte: dayRange().start } },
      orderBy: { date: "asc" },
      take: 5,
    }),
  ]);

  return (
    <>
      <h1 className="text-2xl font-semibold text-ink">Bonjour {user.name}</h1>

      <DueRemindersBanner notes={dueReminders} />

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Vos prochains créneaux</h2>
        {upcomingShifts.length === 0 ? (
          <p className="text-sm text-muted">Aucun créneau à venir.</p>
        ) : (
          <ul className="divide-y divide-line">
            {upcomingShifts.map((shift) => (
              <li key={shift.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">{formatDateFR(shift.date)}</span>
                <span className="text-muted">
                  {shift.startTime} – {shift.endTime}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/pointage" className="mt-3 inline-block text-sm font-medium text-ink underline">
          Pointer mon arrivée / départ →
        </Link>
      </Card>
    </>
  );
}
