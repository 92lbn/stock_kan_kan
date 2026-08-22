import { requireStockAccess } from "@stock-kan-kan/auth/dal";
import { db } from "@stock-kan-kan/db";
import { IdSchema } from "@stock-kan-kan/lib/schemas";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  await requireStockAccess();
  const parsed = IdSchema.safeParse((await params).itemId);
  if (!parsed.success) return new Response("Image introuvable.", { status: 404 });

  const image = await db.stockItem.findFirst({
    where: { id: parsed.data, deletedAt: null },
    select: { imageData: true, imageMimeType: true },
  });
  if (!image?.imageData || !image.imageMimeType) {
    return new Response("Image introuvable.", { status: 404 });
  }

  return new Response(Uint8Array.from(image.imageData).buffer, {
    headers: {
      "Content-Type": image.imageMimeType,
      "Cache-Control": "private, max-age=31536000, immutable",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
