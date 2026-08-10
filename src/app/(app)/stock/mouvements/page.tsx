import Link from "next/link";
import { requireAdmin } from "@stock-kan-kan/auth/dal";
import { db } from "@stock-kan-kan/db";
import { formatEUR, formatQuantity } from "@stock-kan-kan/lib/money";
import { formatDateFR, formatTimeFR } from "@stock-kan-kan/lib/date";
import { Card, Badge } from "@stock-kan-kan/ui/card";

const PAGE_SIZE = 50;

const typeLabel: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
  IN: { label: "Entrée", variant: "success" },
  OUT: { label: "Sortie", variant: "warning" },
  ADJUSTMENT: { label: "Correction", variant: "default" },
};

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const page = Math.max(1, Number((await searchParams).page) || 1);

  const [movements, total] = await Promise.all([
    db.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        stockItem: { select: { name: true, unit: true } },
        createdBy: { select: { name: true } },
      },
    }),
    db.stockMovement.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">Historique des mouvements</h1>
        <Link href="/stock" className="text-sm font-medium text-accent underline">
          ← Retour au stock
        </Link>
      </div>

      <Card>
        {movements.length === 0 ? (
          <p className="text-sm text-muted">Aucun mouvement enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-muted">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Article</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Quantité</th>
                  <th className="pb-2 font-medium">Coût unit.</th>
                  <th className="pb-2 font-medium">Par</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const t = typeLabel[m.type];
                  return (
                    <tr key={m.id} className="border-b border-line">
                      <td className="py-2 text-muted num">
                        {formatDateFR(m.createdAt, "Europe/Paris")} {formatTimeFR(m.createdAt)}
                      </td>
                      <td className="py-2 text-ink">
                        {m.stockItem.name}
                        {m.note && <span className="block text-xs text-muted">{m.note}</span>}
                      </td>
                      <td className="py-2">
                        <Badge variant={t.variant}>{t.label}</Badge>
                      </td>
                      <td className="py-2 num text-ink">
                        {formatQuantity(m.quantity)} {m.stockItem.unit}
                      </td>
                      <td className="py-2 num text-muted">
                        {m.unitCost ? formatEUR(m.unitCost) : "—"}
                      </td>
                      <td className="py-2 text-muted">{m.createdBy?.name ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            {page > 1 ? (
              <Link href={`/stock/mouvements?page=${page - 1}`} className="font-medium text-ink hover:text-accent">
                ‹ Précédent
              </Link>
            ) : (
              <span className="text-muted">‹ Précédent</span>
            )}
            <span className="text-muted tabular-nums">
              Page {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={`/stock/mouvements?page=${page + 1}`} className="font-medium text-ink hover:text-accent">
                Suivant ›
              </Link>
            ) : (
              <span className="text-muted">Suivant ›</span>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
