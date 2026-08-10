import { db } from "@stock-kan-kan/db";
import { getApiUser } from "@stock-kan-kan/auth/dal";
import { toCsv, csvResponse } from "@stock-kan-kan/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getApiUser();
  if (!user || user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const items = await db.stockItem.findMany({
    where: { deletedAt: null },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const csv = toCsv(
    ["Nom", "Catégorie", "Unité", "Quantité", "Seuil", "Coût unitaire", "Allergènes"],
    items.map((i) => [
      i.name,
      i.category,
      i.unit,
      i.quantity.toString(),
      i.minThreshold.toString(),
      i.costPrice.toString(),
      i.allergens ?? "",
    ])
  );

  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`inventaire-${date}.csv`, csv);
}
