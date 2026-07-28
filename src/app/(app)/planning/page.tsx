import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ConfirmAction } from "@/components/confirm-action";
import { MonthNav } from "@/components/month-nav";
import { deleteShift } from "@/lib/actions/planning";
import { sumShiftHours } from "@/lib/hours";
import { colorForId } from "@/lib/colors";
import { monthRange, monthRangeOf, toYearMonth, formatDateFR } from "@/lib/date";
import { PlanningManager } from "@/components/planning-manager";
import { EmployeePlanningCalendar } from "@/components/employee-planning-calendar";
import type { CalendarEvent } from "@/components/month-calendar";

function toDateStr(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Mois sélectionné : ?mois=YYYY-MM, sinon le mois courant (parisien).
function resolveMonth(param?: string) {
  const isValid = param && /^\d{4}-\d{2}$/.test(param);
  const month = isValid ? param : toYearMonth();
  const { start, end } = isValid ? monthRangeOf(month) : monthRange();
  return { month, start, end };
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const user = await getCurrentUser();
  const { mois } = await searchParams;
  const { month, start, end } = resolveMonth(mois);

  if (user.role === "ADMIN") {
    const [employees, shifts] = await Promise.all([
      db.user.findMany({
        where: { role: "EMPLOYEE", deletedAt: null },
        orderBy: { name: "asc" },
      }),
      db.shift.findMany({
        where: { date: { gte: start, lt: end } },
        include: { employee: { select: { id: true, name: true } } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
    ]);

    const hoursByEmployee = new Map<string, { name: string; hours: number }>();
    for (const employee of employees) {
      hoursByEmployee.set(employee.id, { name: employee.name, hours: 0 });
    }
    for (const shift of shifts) {
      const entry = hoursByEmployee.get(shift.employeeId);
      if (entry) entry.hours += sumShiftHours([shift]);
    }

    const events: CalendarEvent[] = shifts.map((shift) => ({
      id: shift.id,
      title: `${shift.employee.name} ${shift.startTime}-${shift.endTime}`,
      date: toDateStr(shift.date),
      color: colorForId(shift.employeeId),
    }));

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-ink">Planning</h1>
          <MonthNav month={month} basePath="/planning" />
        </div>

        <PlanningManager employees={employees} events={events} month={month} />

        <Card>
          <h2 className="mb-3 font-semibold text-ink">
            Total d&apos;heures ce mois-ci
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[...hoursByEmployee.values()].map((e) => (
              <li
                key={e.name}
                className="flex items-center justify-between rounded-md bg-card px-3 py-2 text-sm"
              >
                <span className="text-ink">{e.name}</span>
                <span className="font-medium text-ink">
                  {e.hours.toFixed(1)} h
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-ink">
            Créneaux du mois (liste)
          </h2>
          {shifts.length === 0 ? (
            <p className="text-sm text-muted">Aucun créneau planifié.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-muted">
                  <th className="pb-2 font-medium">Employé</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Horaire</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.id} className="border-b border-line">
                    <td className="py-2 text-ink">
                      {shift.employee.name}
                    </td>
                    <td className="py-2 text-muted">{formatDateFR(shift.date)}</td>
                    <td className="py-2 text-muted">
                      {shift.startTime} – {shift.endTime}
                    </td>
                    <td className="py-2 text-right">
                      <ConfirmAction
                        action={deleteShift.bind(null, shift.id)}
                        title="Supprimer ce créneau ?"
                        message={`${shift.employee.name} — ${formatDateFR(shift.date)} ${shift.startTime}–${shift.endTime}`}
                      />
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

  const shifts = await db.shift.findMany({
    where: { employeeId: user.id, date: { gte: start, lt: end } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  const totalHours = sumShiftHours(shifts);
  const events: CalendarEvent[] = shifts.map((shift) => ({
    id: shift.id,
    title: `${shift.startTime}-${shift.endTime}`,
    date: toDateStr(shift.date),
    color: colorForId(user.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">Mon planning</h1>
        <MonthNav month={month} basePath="/planning" />
      </div>

      <Card>
        <p className="text-sm text-muted">Total prévu ce mois-ci</p>
        <p className="mt-1 text-2xl font-semibold text-ink">
          {totalHours.toFixed(1)} h
        </p>
      </Card>

      <Card>
        <EmployeePlanningCalendar events={events} month={month} />
      </Card>
    </div>
  );
}
