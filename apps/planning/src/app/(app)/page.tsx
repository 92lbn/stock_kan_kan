import Link from "next/link";
import { getCurrentUser } from "@stock-kan-kan/auth/dal";
import { Card } from "@stock-kan-kan/ui/card";

export default async function PlanningHomePage() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-6">
      <div><p className="text-sm font-medium text-accent">kan·kan planning</p><h1 className="text-3xl font-semibold text-ink">Bonjour {user.name}</h1></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card><h2 className="text-lg font-semibold text-ink">Mon planning</h2><p className="mt-1 text-sm text-muted">Consulter les créneaux de la semaine ou du mois.</p><Link className="mt-4 inline-flex min-h-11 items-center font-medium text-accent" href="/planning">Voir le planning</Link></Card>
        <Card><h2 className="text-lg font-semibold text-ink">Pointage</h2><p className="mt-1 text-sm text-muted">Démarrer ou terminer ton service.</p><Link className="mt-4 inline-flex min-h-11 items-center font-medium text-accent" href="/pointage">Ouvrir le pointage</Link></Card>
      </div>
    </div>
  );
}
