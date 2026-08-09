import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { DailyNetChart } from "@/components/daily-net-chart";
import { RecordPayrollButton } from "@/components/record-payroll-button";
import { MonthNav } from "@/components/month-nav";
import { LedgerEntries, type LedgerEntryVM } from "@/components/ledger-entries";
import { addMoney, multiplyMoney, formatEUR } from "@/lib/money";
import { sumShiftHours, computeTotalHours } from "@/lib/hours";
import { computeLaborRatio, classifyLaborRatio } from "@/lib/labor";
import { monthRange, monthRangeOf, toYearMonth, formatMonthFR, formatDateFR } from "@/lib/date";
import { LaborRatioCard, type LaborRow } from "@/components/labor-ratio-card";
import { Prisma } from "@/generated/prisma/client";

export default async function ComptabilitePage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  await requireAdmin();
  const { mois } = await searchParams;
  const isValid = mois && /^\d{4}-\d{2}$/.test(mois);
  const month = isValid ? mois : toYearMonth();
  const { start, end } = isValid ? monthRangeOf(month) : monthRange();

  const [entries, employees, forecasts] = await Promise.all([
    db.ledgerEntry.findMany({
      where: { date: { gte: start, lt: end }, deletedAt: null },
      orderBy: { date: "desc" },
    }),
    db.user.findMany({
      where: { role: "EMPLOYEE", deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        shifts: { where: { date: { gte: start, lt: end } } },
        timeEntries: {
          where: { timestamp: { gte: start, lt: end } },
          orderBy: { timestamp: "asc" },
        },
      },
    }),
    db.dailyForecast.findMany({ where: { date: { gte: start, lt: end } } }),
  ]);

  const monthLabel = formatMonthFR(month);

  const payroll = employees.map((emp) => {
    const plannedHours = sumShiftHours(emp.shifts);
    const actualHours = computeTotalHours(emp.timeEntries);
    return {
      id: emp.id,
      name: emp.name,
      hourlyRate: emp.hourlyRate,
      plannedHours,
      actualHours,
      plannedPay: multiplyMoney(plannedHours, emp.hourlyRate),
      actualPay: multiplyMoney(actualHours, emp.hourlyRate),
    };
  });
  const totalPlannedPay = addMoney(...payroll.map((p) => p.plannedPay));
  const totalActualPay = addMoney(...payroll.map((p) => p.actualPay));

  // Ratio masse salariale / CA, par jour (liaison compta ↔ planning).
  const laborByDay = new Map<string, Prisma.Decimal>();
  for (const emp of employees) {
    for (const shift of emp.shifts) {
      const key = shift.date.toISOString().slice(0, 10);
      const cost = multiplyMoney(sumShiftHours([shift]), emp.hourlyRate);
      laborByDay.set(key, (laborByDay.get(key) ?? new Prisma.Decimal(0)).plus(cost));
    }
  }
  const forecastByDay = new Map(
    forecasts.map((f) => [f.date.toISOString().slice(0, 10), f.expectedRevenue])
  );
  const laborDayKeys = [...new Set([...laborByDay.keys(), ...forecastByDay.keys()])].sort();
  const laborRows: LaborRow[] = laborDayKeys.map((key) => {
    const laborCost = laborByDay.get(key) ?? new Prisma.Decimal(0);
    const forecast = forecastByDay.get(key) ?? null;
    const ratio = computeLaborRatio(laborCost, forecast);
    return {
      date: key,
      label: formatDateFR(new Date(`${key}T00:00:00.000Z`)),
      laborCost: laborCost.toNumber(),
      forecast: forecast ? forecast.toNumber() : null,
      ratio,
      rating: classifyLaborRatio(ratio),
    };
  });
  const monthlyForecast = addMoney(...forecasts.map((f) => f.expectedRevenue));
  const monthlyRatio = computeLaborRatio(totalPlannedPay, monthlyForecast);

  const totalRevenue = addMoney(
    ...entries.filter((e) => e.type === "REVENUE").map((e) => e.amount)
  );
  const totalExpense = addMoney(
    ...entries.filter((e) => e.type === "EXPENSE").map((e) => e.amount)
  );
  const net = totalRevenue.minus(totalExpense);

  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const netByDay = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, net: 0 }));
  for (const entry of entries) {
    const day = entry.date.getUTCDate();
    // Le graphe est purement visuel : on ramène en Number pour l'affichage.
    const signed = (entry.type === "REVENUE" ? entry.amount : entry.amount.negated()).toNumber();
    if (netByDay[day - 1]) netByDay[day - 1].net += signed;
  }

  const entriesVM: LedgerEntryVM[] = entries.map((e) => ({
    id: e.id,
    dateLabel: formatDateFR(e.date),
    type: e.type,
    category: e.category ?? "",
    amount: e.amount.toNumber(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">
          Recettes &amp; dépenses
        </h1>
        <div className="flex items-center gap-4">
          <a
            href={`/api/export/comptabilite?mois=${month}`}
            className="text-sm font-medium text-accent underline"
          >
            Export CSV
          </a>
          <MonthNav month={month} basePath="/comptabilite" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="kpi-label">Recettes</p>
          <p className="num mt-1 text-lg font-semibold text-positive sm:text-2xl">
            {formatEUR(totalRevenue)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="kpi-label">Dépenses</p>
          <p className="num mt-1 text-lg font-semibold text-danger sm:text-2xl">
            {formatEUR(totalExpense)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="kpi-label">Solde</p>
          <p
            className={`num mt-1 text-lg font-semibold sm:text-2xl ${net.gte(0) ? "text-positive" : "text-danger"}`}
          >
            {net.gte(0) ? "+" : ""}
            {formatEUR(net)}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">
          Solde net par jour
        </h2>
        <DailyNetChart data={netByDay} />
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-ink">
          Paye du mois ({monthLabel})
        </h2>
        <p className="mb-3 text-xs text-muted">
          Planifié = heures des créneaux × taux horaire. Réel = heures pointées × taux horaire.
          Réglez le taux horaire dans la page Employés.
        </p>
        {payroll.length === 0 ? (
          <p className="text-sm text-muted">Aucun employé.</p>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {payroll.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                    <span className="text-xs text-muted">
                      <span className="num">{formatEUR(p.hourlyRate)}</span>/h ·{" "}
                      <span className="num">{p.plannedHours.toFixed(1)}</span> h prévu
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="num block text-sm font-semibold text-ink">
                      {formatEUR(p.plannedPay)}
                    </span>
                    <span className="text-xs text-muted">
                      réel <span className="num">{formatEUR(p.actualPay)}</span>
                    </span>
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between py-3 text-sm font-semibold">
                <span className="text-ink">Total planifié</span>
                <span className="num text-ink">{formatEUR(totalPlannedPay)}</span>
              </li>
            </ul>
            <div className="mt-3">
              <RecordPayrollButton
                amount={totalActualPay.toNumber()}
                label={`Salaires ${monthLabel} (heures pointées)`}
              />
            </div>
          </>
        )}
      </Card>

      <LaborRatioCard
        rows={laborRows}
        monthlyCost={totalPlannedPay.toNumber()}
        monthlyRevenue={monthlyForecast.toNumber()}
        monthlyRatio={monthlyRatio}
      />

      <LedgerEntries entries={entriesVM} />
    </div>
  );
}
