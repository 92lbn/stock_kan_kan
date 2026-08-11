import { getCurrentUser } from "@stock-kan-kan/auth/dal";
import { db } from "@stock-kan-kan/db";
import { formatDateFR, formatTimeFR, toYearMonth, wallTimeParisToUtc } from "@stock-kan-kan/lib/date";
import { buildTimeSessions } from "@stock-kan-kan/lib/hours";
import { Badge, Card } from "@stock-kan-kan/ui/card";
import { Icon } from "@stock-kan-kan/ui/icons";
import { MonthNav } from "@/components/month-nav";

export default async function PointageHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const user = await getCurrentUser();
  const { mois } = await searchParams;
  const month = mois && /^\d{4}-(0[1-9]|1[0-2])$/.test(mois) ? mois : toYearMonth();
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1));
  const start = wallTimeParisToUtc(`${month}-01T00:00`);
  const end = wallTimeParisToUtc(
    `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}-01T00:00`
  );

  const people = await db.user.findMany({
    where: user.role === "ADMIN" ? { role: "EMPLOYEE", deletedAt: null } : { id: user.id },
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
  });

  const summaries = people.map((person) => {
    const sessions = buildTimeSessions(person.timeEntries);
    return {
      ...person,
      sessions: sessions.reverse(),
      total: sessions.reduce((sum, session) => sum + session.durationHours, 0),
    };
  });
  const totalHours = summaries.reduce((sum, person) => sum + person.total, 0);
  const serviceCount = summaries.reduce((sum, person) => sum + person.sessions.length, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Suivi des heures</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            {user.role === "ADMIN" ? "Historique de l’équipe" : "Mon historique"}
          </h1>
          <p className="mt-1 text-sm text-muted">Consultez les arrivées et départs enregistrés au restaurant.</p>
        </div>
        <MonthNav month={month} basePath="/pointage" />
      </div>

      <Card className="flex items-start gap-3 border-accent/25 bg-accent/5">
        <span className="mt-0.5 grid h-10 w-10 flex-none place-items-center rounded-xl bg-accent/12 text-accent">
          <Icon name="clock" width={20} height={20} />
        </span>
        <div>
          <h2 className="font-semibold text-ink">Le pointage se fait sur la tablette</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Cette page est uniquement consultative. Pour commencer ou terminer un service, utilisez votre PIN sur la tablette du restaurant.
          </p>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-sm text-muted">Heures enregistrées</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{totalHours.toFixed(1)} h</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">Services pointés</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{serviceCount}</p>
        </Card>
      </div>

      {summaries.length === 0 || summaries.every((person) => person.sessions.length === 0) ? (
        <Card className="py-10 text-center">
          <p className="font-medium text-ink">Aucun pointage ce mois-ci</p>
          <p className="mt-1 text-sm text-muted">Les prochains services enregistrés apparaîtront ici.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {summaries.filter((person) => person.sessions.length > 0).map((person) => (
            <Card key={person.id} className="overflow-hidden p-0">
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                <h2 className="font-semibold text-ink">{person.name}</h2>
                <span className="num text-sm font-semibold text-ink">{person.total.toFixed(1)} h</span>
              </div>
              <div className="hidden grid-cols-[1.3fr_1fr_1fr_auto] gap-4 border-b border-line bg-card-2/55 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
                <span>Date</span>
                <span>Arrivée</span>
                <span>Départ</span>
                <span className="text-right">Durée</span>
              </div>
              <ul className="divide-y divide-line">
                {person.sessions.map((session) => (
                  <li key={session.clockIn.toISOString()} className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-[1.3fr_1fr_1fr_auto] sm:items-center">
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted sm:hidden">Date</span>
                      <p className="font-medium text-ink">{formatDateFR(session.clockIn, "Europe/Paris")}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-muted sm:hidden">Arrivée</span>
                      <p className="num mt-0.5 text-sm font-medium text-ink">{formatTimeFR(session.clockIn)}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-muted sm:hidden">Départ</span>
                      {session.clockOut ? (
                        <p className="num mt-0.5 text-sm font-medium text-ink">{formatTimeFR(session.clockOut)}</p>
                      ) : (
                        <Badge variant="success" className="mt-1">En service</Badge>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center justify-between border-t border-line pt-3 sm:col-span-1 sm:block sm:border-0 sm:pt-0 sm:text-right">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted sm:hidden">Durée</span>
                      <span className="num text-sm font-semibold text-ink">{session.durationHours.toFixed(1)} h</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
