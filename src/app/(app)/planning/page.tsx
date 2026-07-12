import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteShift } from "@/lib/actions/planning";
import { sumShiftHours } from "@/lib/hours";
import { colorForId } from "@/lib/colors";
import { PlanningManager } from "@/components/planning-manager";
import { EmployeePlanningCalendar } from "@/components/employee-planning-calendar";
import type { CalendarEvent } from "@/components/planning-calendar";

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

// Wider window so the calendar's prev/next navigation shows real data
// without needing a client-side refetch.
function calendarRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 2, 1);
  return { start, end };
}

function toDateStr(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function PlanningPage() {
  const user = await getCurrentUser();
  const { start, end } = monthRange();
  const calendarWindow = calendarRange();

  if (user.role === "ADMIN") {
    const [employees, shifts, calendarShifts] = await Promise.all([
      db.user.findMany({ where: { role: "EMPLOYEE" }, orderBy: { name: "asc" } }),
      db.shift.findMany({
        where: { date: { gte: start, lt: end } },
        include: { employee: { select: { id: true, name: true } } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      db.shift.findMany({
        where: { date: { gte: calendarWindow.start, lt: calendarWindow.end } },
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

    const events: CalendarEvent[] = calendarShifts.map((shift) => ({
      id: shift.id,
      title: `${shift.employee.name} ${shift.startTime}-${shift.endTime}`,
      date: toDateStr(shift.date),
      color: colorForId(shift.employeeId),
    }));

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Planning du mois
        </h1>

        <PlanningManager employees={employees} events={events} />

        <Card>
          <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
            Total d&apos;heures ce mois-ci
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[...hoursByEmployee.values()].map((e) => (
              <li
                key={e.name}
                className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800"
              >
                <span className="text-zinc-700 dark:text-zinc-300">{e.name}</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {e.hours.toFixed(1)} h
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
            Créneaux du mois (liste)
          </h2>
          {shifts.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucun créneau planifié.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
                  <th className="pb-2 font-medium">Employé</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Horaire</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-2 text-zinc-700 dark:text-zinc-300">
                      {shift.employee.name}
                    </td>
                    <td className="py-2 text-zinc-500">
                      {shift.date.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-2 text-zinc-500">
                      {shift.startTime} – {shift.endTime}
                    </td>
                    <td className="py-2 text-right">
                      <form action={deleteShift.bind(null, shift.id)}>
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

  const [shifts, calendarShifts] = await Promise.all([
    db.shift.findMany({
      where: { employeeId: user.id, date: { gte: start, lt: end } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    db.shift.findMany({
      where: {
        employeeId: user.id,
        date: { gte: calendarWindow.start, lt: calendarWindow.end },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
  ]);
  const totalHours = sumShiftHours(shifts);
  const events: CalendarEvent[] = calendarShifts.map((shift) => ({
    id: shift.id,
    title: `${shift.startTime}-${shift.endTime}`,
    date: toDateStr(shift.date),
    color: colorForId(user.id),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Mon planning</h1>

      <Card>
        <p className="text-sm text-zinc-500">Total prévu ce mois-ci</p>
        <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {totalHours.toFixed(1)} h
        </p>
      </Card>

      <Card>
        <EmployeePlanningCalendar events={events} />
      </Card>
    </div>
  );
}
