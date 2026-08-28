import { db } from "@stock-kan-kan/db";
import { Prisma } from "@stock-kan-kan/db/client";
import { StockCategory } from "@stock-kan-kan/db/enums";
import { auditData } from "@stock-kan-kan/lib/audit";
import { dayRange, weekRangeOf, weekStart, toYmd, wallTimeParisToUtc, toYearMonth } from "@stock-kan-kan/lib/date";
import { buildTimeSessions, sumShiftHours } from "@stock-kan-kan/lib/hours";
import { z } from "zod";
import { authenticateDashboardManager, dashboardCorsHeaders } from "@/lib/dashboard-api-auth";
import { stockAlertState, summarizeStockItems } from "@/lib/dashboard-stock";

export const runtime = "nodejs";
export const preferredRegion = "dub1";

const querySchema = z.discriminatedUnion("vue", [
  z.object({
    vue: z.literal("planning"),
    semaine: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  z.object({
    vue: z.literal("pointages"),
    mois: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
    employe: z.union([z.literal("tous"), z.string().uuid()]).optional(),
  }),
  z.object({ vue: z.literal("stock") }),
]);

const decimal3 = z.string().trim().regex(/^\d{1,9}(?:[.,]\d{1,3})?$/).transform((value) => value.replace(",", "."));
const decimal2 = z.string().trim().regex(/^\d{1,10}(?:[.,]\d{1,2})?$/).transform((value) => value.replace(",", "."));
const stockUpdateSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  category: z.enum(StockCategory),
  unit: z.string().trim().min(1).max(40),
  minThreshold: decimal3,
  costPrice: decimal2,
  allergens: z.string().trim().max(500).optional(),
  barcode: z.string().trim().max(64).optional(),
});

function json(data: unknown, status: number, origin: string | null) {
  return Response.json(data, { status, headers: dashboardCorsHeaders(origin) });
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  const headers = dashboardCorsHeaders(origin);
  if (!headers.has("Access-Control-Allow-Origin")) {
    return new Response(null, { status: 403, headers });
  }
  return new Response(null, { status: 204, headers });
}

export async function GET(request: Request) {
  const manager = await authenticateDashboardManager(request);
  if (!manager.ok) return json({ error: manager.error }, manager.status, manager.origin);

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return json({ error: "Filtres invalides." }, 400, manager.origin);
  }

  try {
    if (parsed.data.vue === "stock") {
      const today = toYmd(dayRange().start);
      const [rawItems, valuation] = await Promise.all([
        db.stockItem.findMany({
          where: { deletedAt: null },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            category: true,
            unit: true,
            minThreshold: true,
            costPrice: true,
            allergens: true,
            barcode: true,
            updatedAt: true,
            lots: {
              where: { quantity: { gt: 0 } },
              orderBy: [{ expiryDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
              select: { quantity: true, expiryDate: true },
            },
          },
        }),
        db.$queryRaw<{ value: Prisma.Decimal }[]>`
          SELECT COALESCE(SUM(l.quantity * i."costPrice"), 0) AS value
          FROM stock_lots l JOIN stock_items i ON i.id = l."stockItemId"
          WHERE i."deletedAt" IS NULL AND l.quantity > 0
        `,
      ]);
      const items = rawItems.map((item) => {
        const quantity = item.lots
          .reduce((total, lot) => total.plus(lot.quantity), new Prisma.Decimal(0))
          .toString();
        const nextExpiry = item.lots.find((lot) => lot.expiryDate)?.expiryDate;
        const alertSource = {
          quantity,
          minThreshold: item.minThreshold.toString(),
          nextExpiry: nextExpiry ? toYmd(nextExpiry) : null,
        };
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          unit: item.unit,
          ...alertSource,
          costPrice: item.costPrice.toString(),
          allergens: item.allergens ?? "",
          barcode: item.barcode ?? "",
          lotCount: item.lots.length,
          updatedAt: item.updatedAt.toISOString(),
          ...stockAlertState(alertSource, today),
        };
      });
      return json(
        {
          today,
          value: valuation[0]?.value?.toString() ?? "0",
          summary: summarizeStockItems(items, today),
          items,
        },
        200,
        manager.origin
      );
    }

    if (parsed.data.vue === "planning") {
      const week = parsed.data.semaine ?? toYmd(weekStart());
      const { start, end } = weekRangeOf(week);
      const [employees, shifts] = await Promise.all([
        db.user.findMany({
          where: { role: "EMPLOYEE", deletedAt: null },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        db.shift.findMany({
          where: { date: { gte: start, lt: end }, employee: { deletedAt: null } },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            note: true,
            employee: { select: { id: true, name: true } },
          },
        }),
      ]);
      return json(
        {
          week,
          employees: employees.map((employee) => ({
            ...employee,
            hours: sumShiftHours(shifts.filter((shift) => shift.employee.id === employee.id)),
          })),
          shifts: shifts.map((shift) => ({ ...shift, date: toYmd(shift.date) })),
        },
        200,
        manager.origin
      );
    }

    const month = parsed.data.mois ?? toYearMonth();
    const [year, monthNumber] = month.split("-").map(Number);
    const nextMonth = new Date(Date.UTC(year, monthNumber, 1));
    const start = wallTimeParisToUtc(`${month}-01T00:00`);
    const end = wallTimeParisToUtc(
      `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}-01T00:00`
    );
    const selectedEmployee = parsed.data.employe;
    const people = await db.user.findMany({
      where: {
        role: "EMPLOYEE",
        deletedAt: null,
        ...(selectedEmployee && selectedEmployee !== "tous" ? { id: selectedEmployee } : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        timeEntries: {
          where: { timestamp: { gte: start, lt: end } },
          orderBy: { timestamp: "asc" },
          select: { type: true, timestamp: true },
        },
      },
    });
    return json(
      {
        month,
        people: people.map((person) => {
          const sessions = buildTimeSessions(person.timeEntries);
          return {
            id: person.id,
            name: person.name,
            totalHours: sessions.reduce((total, session) => total + session.durationHours, 0),
            sessions: sessions.reverse().map((session) => ({
              clockIn: session.clockIn.toISOString(),
              clockOut: session.clockOut?.toISOString() ?? null,
              durationHours: session.durationHours,
              isOpen: session.isOpen,
            })),
          };
        }),
      },
      200,
      manager.origin
    );
  } catch {
    return json({ error: "Impossible de charger les données de pilotage." }, 500, manager.origin);
  }
}

export async function PATCH(request: Request) {
  const manager = await authenticateDashboardManager(request);
  if (!manager.ok) return json({ error: manager.error }, manager.status, manager.origin);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Données de fiche invalides." }, 400, manager.origin);
  }
  const parsed = stockUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Données de fiche invalides." }, 400, manager.origin);
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      const before = await tx.stockItem.findFirst({
        where: { id: parsed.data.id, deletedAt: null },
        select: {
          id: true, name: true, category: true, unit: true, minThreshold: true,
          costPrice: true, allergens: true, barcode: true,
        },
      });
      if (!before) return null;
      const after = await tx.stockItem.update({
        where: { id: before.id },
        data: {
          name: parsed.data.name,
          category: parsed.data.category,
          unit: parsed.data.unit,
          minThreshold: parsed.data.minThreshold,
          costPrice: parsed.data.costPrice,
          allergens: parsed.data.allergens || null,
          barcode: parsed.data.barcode || null,
        },
        select: {
          id: true, name: true, category: true, unit: true, minThreshold: true,
          costPrice: true, allergens: true, barcode: true, updatedAt: true,
        },
      });
      await tx.auditLog.create({
        data: auditData({
          action: "stock.update.dashboard",
          entity: "StockItem",
          entityId: before.id,
          before,
          after: { ...after, managerEmail: manager.email },
        }),
      });
      return after;
    });
    if (!updated) return json({ error: "Article introuvable." }, 404, manager.origin);
    return json({
      item: {
        ...updated,
        minThreshold: updated.minThreshold.toString(),
        costPrice: updated.costPrice.toString(),
        allergens: updated.allergens ?? "",
        barcode: updated.barcode ?? "",
        updatedAt: updated.updatedAt.toISOString(),
      },
    }, 200, manager.origin);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return json({ error: "Ce code-barres est déjà utilisé par un autre article." }, 409, manager.origin);
    }
    console.error("dashboard_stock_update_failed", error);
    return json({ error: "La fiche n’a pas pu être enregistrée." }, 500, manager.origin);
  }
}
