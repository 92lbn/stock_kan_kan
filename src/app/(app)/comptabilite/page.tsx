import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { LedgerForm } from "@/components/ledger-form";
import { DailyNetChart } from "@/components/daily-net-chart";
import { RecordPayrollButton } from "@/components/record-payroll-button";
import { ConfirmAction } from "@/components/confirm-action";
import { MonthNav } from "@/components/month-nav";
import { deleteLedgerEntry } from "@/lib/actions/ledger";
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Recettes du mois</p>
          <p className="mt-1 text-2xl font-semibold text-positive">
            +{formatEUR(totalRevenue)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Dépenses du mois</p>
          <p className="mt-1 text-2xl font-semibold text-accent">
            -{formatEUR(totalExpense)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Solde net</p>
          <p
            className={`mt-1 text-2xl font-semibold ${net.gte(0) ? "text-ink" : "text-accent"}`}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase text-muted">
                    <th className="pb-2 font-medium">Employé</th>
                    <th className="pb-2 font-medium">Taux</th>
                    <th className="pb-2 font-medium">Planifié</th>
                    <th className="pb-2 font-medium">Paye planifiée</th>
                    <th className="pb-2 font-medium">Réel (pointé)</th>
                    <th className="pb-2 font-medium">Paye réelle</th>
                  </tr>
                </thead>
                <tbody>
                  {payroll.map((p) => (
                    <tr key={p.id} className="border-b border-line">
                      <td className="py-2 text-ink">{p.name}</td>
                      <td className="py-2 text-muted">{formatEUR(p.hourlyRate)}/h</td>
                      <td className="py-2 text-muted">{p.plannedHours.toFixed(1)} h</td>
                      <td className="py-2 text-ink">
                        {formatEUR(p.plannedPay)}
                      </td>
                      <td className="py-2 text-muted">{p.actualHours.toFixed(1)} h</td>
                      <td className="py-2 font-medium text-ink">
                        {formatEUR(p.actualPay)}
                      </td>
                    </tr>
                  ))}
                  <tr className="text-sm font-semibold">
                    <td className="pt-3 text-ink">Total</td>
                    <td className="pt-3"></td>
                    <td className="pt-3"></td>
                    <td className="pt-3 text-ink">
                      {formatEUR(totalPlannedPay)}
                    </td>
                    <td className="pt-3"></td>
                    <td className="pt-3 text-ink">
                      {formatEUR(totalActualPay)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4">
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

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Nouvelle entrée</h2>
        <LedgerForm />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">
          Entrées du mois
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">Aucune entrée ce mois-ci.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-muted">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Catégorie</th>
                <th className="pb-2 font-medium">Montant</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-line">
                  <td className="py-2 text-muted">{formatDateFR(entry.date)}</td>
                  <td className="py-2 text-ink">
                    {entry.type === "REVENUE" ? "Recette" : "Dépense"}
                  </td>
                  <td className="py-2 text-muted">{entry.category ?? "—"}</td>
                  <td
                    className={
                      entry.type === "REVENUE"
                        ? "py-2 text-positive"
                        : "py-2 text-accent"
                    }
                  >
                    {entry.type === "REVENUE" ? "+" : "-"}
                    {formatEUR(entry.amount)}
                  </td>
                  <td className="py-2 text-right">
                    <ConfirmAction
                      action={deleteLedgerEntry.bind(null, entry.id)}
                      message="L'entrée sera masquée (suppression réversible)."
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
