import { db } from "@stock-kan-kan/db";
import { IdSchema } from "@stock-kan-kan/lib/schemas";
import { authenticateDashboardManager, dashboardCorsHeaders } from "@/lib/dashboard-api-auth";

export const runtime = "nodejs";
export const preferredRegion = "dub1";

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  const headers = dashboardCorsHeaders(origin);
  if (!headers.has("Access-Control-Allow-Origin")) {
    return new Response(null, { status: 403, headers });
  }
  return new Response(null, { status: 204, headers });
}

export async function GET(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const manager = await authenticateDashboardManager(request);
  if (!manager.ok) {
    return Response.json(
      { error: manager.error },
      { status: manager.status, headers: dashboardCorsHeaders(manager.origin) }
    );
  }

  const parsed = IdSchema.safeParse((await params).itemId);
  if (!parsed.success) {
    return new Response("Image introuvable.", {
      status: 404,
      headers: dashboardCorsHeaders(manager.origin),
    });
  }

  const image = await db.stockItem.findFirst({
    where: { id: parsed.data, deletedAt: null },
    select: { imageData: true, imageMimeType: true },
  });
  if (!image?.imageData || !image.imageMimeType) {
    return new Response("Image introuvable.", {
      status: 404,
      headers: dashboardCorsHeaders(manager.origin),
    });
  }

  const headers = dashboardCorsHeaders(manager.origin);
  headers.set("Content-Type", image.imageMimeType);
  headers.set("Cache-Control", "private, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(Uint8Array.from(image.imageData).buffer, { headers });
}
