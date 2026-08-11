import Link from "next/link";
import { Card } from "@stock-kan-kan/ui/card";

export default function StockHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-accent">kan·kan stock</p>
        <h1 className="text-3xl font-semibold text-ink">Stock et notes</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold text-ink">Pointage</h2>
          <p className="mt-1 text-sm text-muted">Pointer une arrivée ou un départ avec un PIN personnel.</p>
          <Link className="mt-4 inline-flex min-h-11 items-center font-medium text-accent" href="/pointage">
            Ouvrir le pointage
          </Link>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-ink">Inventaire</h2>
          <p className="mt-1 text-sm text-muted">Consulter les niveaux et enregistrer un mouvement.</p>
          <Link className="mt-4 inline-flex min-h-11 items-center font-medium text-accent" href="/stock">
            Ouvrir le stock
          </Link>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-ink">Notes</h2>
          <p className="mt-1 text-sm text-muted">Retrouver les tâches et rappels de cuisine.</p>
          <Link className="mt-4 inline-flex min-h-11 items-center font-medium text-accent" href="/notes">
            Ouvrir mes notes
          </Link>
        </Card>
      </div>
    </div>
  );
}
