import { db } from "@/lib/db";
import { getApiUser } from "@/lib/dal";
import { toCsv, csvResponse } from "@/lib/csv";
import { monthRange, monthRangeOf, toYearMonth, formatDateFR } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user || user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const mois = new URL(request.url).searchParams.get("mois");
  const isValid = mois && /^\d{4}-\d{2}$/.test(mois);
  const month = isValid ? mois : toYearMonth();
  const { start, end } = isValid ? monthRangeOf(month) : monthRange();

  const entries = await db.ledgerEntry.findMany({
    where: { date: { gte: start, lt: end }, deletedAt: null },
    orderBy: { date: "asc" },
  });

  const csv = toCsv(
    ["Date", "Type", "Catégorie", "Montant", "Note"],
    entries.map((e) => [
      formatDateFR(e.date),
      e.type === "REVENUE" ? "Recette" : "Dépense",
      e.category ?? "",
      e.amount.toString(),
      e.note ?? "",
    ])
  );

  return csvResponse(`comptabilite-${month}.csv`, csv);
}
