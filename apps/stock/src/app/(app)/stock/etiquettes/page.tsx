import { Suspense } from "react";
import { requireStockAccess } from "@stock-kan-kan/auth/dal";
import { db } from "@stock-kan-kan/db";
import { LabelsView, type LabelItem } from "@/components/labels-view";
import { Skeleton, ListSkeleton } from "@stock-kan-kan/ui/skeleton";

// Shell instantané : titre statique. Seule la liste des produits est en <Suspense>.
export default function EtiquettesPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-ink print:hidden">Étiquettes</h1>
      <Suspense fallback={<EtiquettesSkeleton />}>
        <EtiquettesContent />
      </Suspense>
    </div>
  );
}

function EtiquettesSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-11 w-full" />
      <ListSkeleton rows={7} />
    </div>
  );
}

async function EtiquettesContent() {
  await requireStockAccess();

  const rawItems = await db.stockItem.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, category: true, imageMimeType: true, updatedAt: true },
  });
  const items: LabelItem[] = rawItems.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    hasImage: Boolean(item.imageMimeType),
    imageVersion: item.updatedAt.getTime().toString(),
  }));

  return <LabelsView items={items} />;
}
