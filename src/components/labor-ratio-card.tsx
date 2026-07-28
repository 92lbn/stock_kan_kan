"use client";

import { setDailyForecast } from "@/lib/actions/forecast";
import { Card, Badge } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export type LaborRow = {
  date: string; // YYYY-MM-DD
  label: string;
  laborCost: number;
  forecast: number | null;
  ratio: number | null;
  rating: "bon" | "cible" | "eleve" | "critique" | null;
};

const ratingVariant: Record<string, "success" | "warning" | "danger" | "default"> = {
  bon: "success",
  cible: "success",
  eleve: "warning",
  critique: "danger",
};

export function LaborRatioCard({
  rows,
  monthlyCost,
  monthlyRevenue,
  monthlyRatio,
}: {
  rows: LaborRow[];
  monthlyCost: number;
  monthlyRevenue: number;
  monthlyRatio: number | null;
}) {
  return (
    <Card>
      <h2 className="mb-1 font-semibold text-ink">Masse salariale / CA</h2>
      <p className="mb-3 text-xs text-muted">
        Coût du planning (heures × taux) rapporté au CA prévisionnel. Cible ~30 %. Saisis le CA
        prévu par jour pour suivre le ratio.
      </p>

      <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <div>
          <span className="kpi-label">Masse salariale prévue</span>
          <span className="num ml-2 text-lg font-semibold text-ink">{eur.format(monthlyCost)}</span>
        </div>
        <div>
          <span className="kpi-label">CA prévu</span>
          <span className="num ml-2 text-lg font-semibold text-ink">
            {eur.format(monthlyRevenue)}
          </span>
        </div>
        <div>
          <span className="kpi-label">Ratio</span>
          <span
            className={`num ml-2 text-lg font-semibold ${
              monthlyRatio !== null && monthlyRatio > 30 ? "text-accent" : "text-ink"
            }`}
          >
            {monthlyRatio !== null ? `${monthlyRatio.toFixed(0)} %` : "—"}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Aucun créneau planifié ce mois-ci.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-muted">
                <th className="pb-2 font-medium">Jour</th>
                <th className="pb-2 font-medium">Personnel</th>
                <th className="pb-2 font-medium">CA prévu</th>
                <th className="pb-2 font-medium">Ratio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date} className="border-b border-line">
                  <td className="py-2 capitalize text-ink">{r.label}</td>
                  <td className="num py-2 text-ink">{eur.format(r.laborCost)}</td>
                  <td className="py-2">
                    <form action={setDailyForecast.bind(null, r.date)} className="flex items-center gap-1">
                      <Input
                        name="expectedRevenue"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={r.forecast ?? ""}
                        className="h-8 w-24 text-xs"
                        aria-label={`CA prévu ${r.label}`}
                      />
                      <Button type="submit" size="sm" variant="ghost">
                        OK
                      </Button>
                    </form>
                  </td>
                  <td className="py-2">
                    {r.ratio !== null && r.rating ? (
                      <Badge variant={ratingVariant[r.rating]}>{r.ratio.toFixed(0)} %</Badge>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
