import { requireStockAccess } from "@stock-kan-kan/auth/dal";
import { db } from "@stock-kan-kan/db";
import { parisDayRange } from "@stock-kan-kan/lib/date";
import { computeTotalHoursIncludingOpen } from "@stock-kan-kan/lib/hours";
import { KioskPanel, type KioskEmployee } from "@/components/kiosk-panel";

export default async function KioskPointagePage() {
  await requireStockAccess();
  const now = new Date();
  const { start, end } = parisDayRange(now);
  const [employees, latestEntries] = await Promise.all([
    db.user.findMany({
      where: { role: "EMPLOYEE", deletedAt: null, pinHash: { not: null } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        timeEntries: {
          where: { timestamp: { gte: start, lt: end } },
          orderBy: { timestamp: "asc" },
          select: { type: true, timestamp: true },
        },
      },
    }),
    db.timeEntry.findMany({
      where: {
        employee: { role: "EMPLOYEE", deletedAt: null, pinHash: { not: null } },
      },
      orderBy: [{ employeeId: "asc" }, { timestamp: "desc" }],
      distinct: ["employeeId"],
      select: { employeeId: true, type: true },
    }),
  ]);
  const latestByEmployee = new Map(latestEntries.map((entry) => [entry.employeeId, entry.type]));
  const viewModel: KioskEmployee[] = employees.map((employee) => {
    const isClockedIn = latestByEmployee.get(employee.id) === "CLOCK_IN";
    const entries = [...employee.timeEntries];
    if (entries[0]?.type === "CLOCK_OUT" || (entries.length === 0 && isClockedIn)) {
      entries.unshift({ type: "CLOCK_IN", timestamp: start });
    }
    return {
      id: employee.id,
      name: employee.name,
      isClockedIn,
      todayHours: computeTotalHoursIncludingOpen(entries, now).toFixed(1),
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-accent">Poste partagé</p>
        <h1 className="text-3xl font-semibold text-ink">Pointage de l’équipe</h1>
        <p className="mt-2 text-sm text-muted">Choisissez votre nom, puis saisissez votre PIN personnel.</p>
      </header>
      <KioskPanel employees={viewModel} />
    </div>
  );
}
