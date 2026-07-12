import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ClockButton } from "@/components/clock-button";
import { computeTotalHours } from "@/lib/hours";

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export default async function PointagePage() {
  const user = await getCurrentUser();
  const { start, end } = monthRange();

  const myEntries = await db.timeEntry.findMany({
    where: { employeeId: user.id, timestamp: { gte: start, lt: end } },
    orderBy: { timestamp: "asc" },
  });
  const lastEntry = myEntries[myEntries.length - 1];
  const isClockedIn = lastEntry?.type === "CLOCK_IN";
  const myMonthlyHours = computeTotalHours(myEntries);

  let adminSection = null;
  if (user.role === "ADMIN") {
    const employees = await db.user.findMany({
      where: { role: "EMPLOYEE" },
      orderBy: { name: "asc" },
      include: {
        timeEntries: {
          where: { timestamp: { gte: start, lt: end } },
          orderBy: { timestamp: "asc" },
        },
      },
    });

    adminSection = (
      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
          Heures pointées ce mois-ci (équipe)
        </h2>
        {employees.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun employé pour le moment.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {employees.map((e) => {
              const last = e.timeEntries[e.timeEntries.length - 1];
              const status = last?.type === "CLOCK_IN" ? "En service" : "Hors service";
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800"
                >
                  <div>
                    <p className="text-zinc-700 dark:text-zinc-300">{e.name}</p>
                    <p className="text-xs text-zinc-500">{status}</p>
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {computeTotalHours(e.timeEntries).toFixed(1)} h
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Pointage</h1>

      <Card className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="text-sm text-zinc-500">
          {isClockedIn ? "Vous êtes actuellement en service." : "Vous n'êtes pas en service."}
        </p>
        <ClockButton isClockedIn={isClockedIn} />
        <p className="text-sm text-zinc-500">
          Total pointé ce mois-ci : <span className="font-medium text-zinc-900 dark:text-zinc-100">{myMonthlyHours.toFixed(1)} h</span>
        </p>
      </Card>

      {adminSection}
    </div>
  );
}
