import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { sumShiftHours } from "@/lib/hours";
import { colorForId } from "@/lib/colors";
import {
  monthRangeOf,
  toYearMonth,
  formatMonthFR,
  weekRangeOf,
  weekDays,
  weekStart,
  weekStartOfYmd,
  addDays,
  toYmd,
  formatWeekLabel,
  frenchWeekday,
  dayRange,
} from "@/lib/date";
import { PlanningBoard, type BoardDay } from "@/components/planning-board";
import type { CalendarEvent } from "@/components/month-calendar";

const pad = (n: number) => String(n).padStart(2, "0");
function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; semaine?: string; mois?: string }>;
}) {
  const user = await getCurrentUser();
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;
  const view: "semaine" | "mois" = sp.vue === "mois" ? "mois" : "semaine";

  // Période sélectionnée selon la vue.
  const weekParam =
    sp.semaine && /^\d{4}-\d{2}-\d{2}$/.test(sp.semaine)
      ? toYmd(weekStartOfYmd(sp.semaine))
      : toYmd(weekStart());
  const month = sp.mois && /^\d{4}-\d{2}$/.test(sp.mois) ? sp.mois : toYearMonth();
  const { start, end } = view === "semaine" ? weekRangeOf(weekParam) : monthRangeOf(month);
  const todayYmd = toYmd(dayRange().start);

  const shifts = await db.shift.findMany({
    where: { date: { gte: start, lt: end }, ...(isAdmin ? {} : { employeeId: user.id }) },
    include: { employee: { select: { id: true, name: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  const employees = isAdmin
    ? await db.user.findMany({
        where: { role: "EMPLOYEE", deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const shiftName = (s: (typeof shifts)[number]) => s.employee.name;
  const shiftColor = (s: (typeof shifts)[number]) => colorForId(s.employee.id);

  // Données de la vue semaine : 7 jours groupés.
  const days: BoardDay[] =
    view === "semaine"
      ? weekDays(weekParam).map((ymd) => {
          const dayShifts = shifts.filter((s) => toYmd(s.date) === ymd);
          return {
            ymd,
            label: frenchWeekday(ymd),
            hours: sumShiftHours(dayShifts),
            shifts: dayShifts.map((s) => ({
              id: s.id,
              name: shiftName(s),
              startTime: s.startTime,
              endTime: s.endTime,
              color: shiftColor(s),
            })),
          };
        })
      : [];

  // Données de la vue mois.
  const events: CalendarEvent[] =
    view === "mois"
      ? shifts.map((s) => ({
          id: s.id,
          title: isAdmin ? `${shiftName(s)} ${s.startTime}` : `${s.startTime}-${s.endTime}`,
          date: toYmd(s.date),
          color: shiftColor(s),
        }))
      : [];

  // Totaux d'heures sur la période.
  const totals = isAdmin
    ? employees
        .map((e) => ({
          name: e.name,
          hours: sumShiftHours(shifts.filter((s) => s.employee.id === e.id)),
        }))
        .filter((t) => t.hours > 0)
    : [{ name: user.name, hours: sumShiftHours(shifts) }];
  const periodLabel = view === "semaine" ? formatWeekLabel(weekParam) : formatMonthFR(month);

  const seg = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${active ? "bg-accent text-accent-ink" : "text-muted"}`;
  const navBtn =
    "grid h-9 w-9 place-items-center rounded-md border border-line text-muted hover:bg-card-2 hover:text-ink";
  const prevHref =
    view === "semaine"
      ? `/planning?vue=semaine&semaine=${toYmd(addDays(weekStartOfYmd(weekParam), -7))}`
      : `/planning?vue=mois&mois=${shiftMonth(month, -1)}`;
  const nextHref =
    view === "semaine"
      ? `/planning?vue=semaine&semaine=${toYmd(addDays(weekStartOfYmd(weekParam), 7))}`
      : `/planning?vue=mois&mois=${shiftMonth(month, 1)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">{isAdmin ? "Planning" : "Mon planning"}</h1>
        <div className="inline-flex rounded-lg border border-line bg-card p-0.5">
          <Link href={`/planning?vue=semaine&semaine=${weekParam}`} className={seg(view === "semaine")}>
            Semaine
          </Link>
          <Link href={`/planning?vue=mois&mois=${month}`} className={seg(view === "mois")}>
            Mois
          </Link>
        </div>
      </div>

      {/* Navigation de période */}
      <div className="flex items-center justify-center gap-3">
        <Link href={prevHref} aria-label="Période précédente" className={navBtn}>
          ‹
        </Link>
        <span className="min-w-44 text-center text-sm font-medium capitalize text-ink">
          {periodLabel}
        </span>
        <Link href={nextHref} aria-label="Période suivante" className={navBtn}>
          ›
        </Link>
      </div>

      <PlanningBoard
        view={view}
        days={days}
        events={events}
        month={month}
        employees={employees}
        canEdit={isAdmin}
        today={todayYmd}
      />

      {totals.length > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-ink">
            Heures {view === "semaine" ? "de la semaine" : "du mois"}
          </h2>
          <ul className="divide-y divide-line">
            {totals.map((t) => (
              <li key={t.name} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">{t.name}</span>
                <span className="num font-medium text-ink">{t.hours.toFixed(1)} h</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
