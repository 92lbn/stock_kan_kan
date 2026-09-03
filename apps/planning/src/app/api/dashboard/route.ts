import { db } from "@stock-kan-kan/db";
import { Prisma } from "@stock-kan-kan/db/client";
import { StockCategory } from "@stock-kan-kan/db/enums";
import { auditData } from "@stock-kan-kan/lib/audit";
import { addDays, dayRange, parseDateInput, weekRangeOf, weekStart, toYmd, wallTimeParisToUtc, toYearMonth } from "@stock-kan-kan/lib/date";
import { buildTimeSessionsWithIds, datedShiftsOverlap, sumShiftHours } from "@stock-kan-kan/lib/hours";
import bcrypt from "bcryptjs";
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
  z.object({ vue: z.literal("employees") }),
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
const employeeCreateSchema = z.object({
  resource: z.literal("employee"),
  identifier: z.string().trim().min(1).max(80).toLowerCase(),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128),
  pin: z.string().regex(/^\d{4,6}$/).optional(),
  hourlyRate: decimal2,
  canStock: z.boolean(),
});
const employeeUpdateSchema = z.object({
  resource: z.literal("employee"),
  id: z.string().trim().min(1),
  identifier: z.string().trim().min(1).max(80).toLowerCase(),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128).optional(),
  pin: z.union([z.string().regex(/^\d{4,6}$/), z.null()]).optional(),
  hourlyRate: decimal2,
  canStock: z.boolean(),
});
const shiftInputSchema = z.object({
  resource: z.literal("shift"),
  id: z.string().trim().min(1).optional(),
  employeeId: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  note: z.string().trim().max(240).optional(),
});
const wallDateTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/);
const timeSessionInputSchema = z.object({
  resource: z.literal("timeSession"),
  employeeId: z.string().trim().min(1),
  clockIn: wallDateTimeSchema,
  clockOut: wallDateTimeSchema,
  clockInId: z.string().trim().min(1).optional(),
  clockOutId: z.string().trim().min(1).optional(),
});
const deleteSchema = z.discriminatedUnion("resource", [
  z.object({ resource: z.literal("employee"), id: z.string().trim().min(1) }),
  z.object({ resource: z.literal("shift"), id: z.string().trim().min(1) }),
  z.object({
    resource: z.literal("timeSession"),
    employeeId: z.string().trim().min(1),
    clockInId: z.string().trim().min(1),
    clockOutId: z.string().trim().min(1).optional(),
  }),
]);

function json(data: unknown, status: number, origin: string | null) {
  return Response.json(data, { status, headers: dashboardCorsHeaders(origin) });
}

function parseTimeSession(input: z.infer<typeof timeSessionInputSchema>) {
  const clockIn = wallTimeParisToUtc(input.clockIn);
  const clockOut = wallTimeParisToUtc(input.clockOut);
  const durationMs = clockOut.getTime() - clockIn.getTime();
  if (durationMs <= 0 || durationMs > 36 * 60 * 60 * 1000) return null;
  return { clockIn, clockOut };
}

async function timeSessionConflicts(
  tx: Prisma.TransactionClient,
  employeeId: string,
  clockIn: Date,
  clockOut: Date,
  excludedIds: string[] = []
) {
  const idFilter = excludedIds.length ? { notIn: excludedIds } : undefined;
  const [inside, previous, next] = await Promise.all([
    tx.timeEntry.count({
      where: { employeeId, ...(idFilter ? { id: idFilter } : {}), timestamp: { gte: clockIn, lte: clockOut } },
    }),
    tx.timeEntry.findFirst({
      where: { employeeId, ...(idFilter ? { id: idFilter } : {}), timestamp: { lt: clockIn } },
      orderBy: { timestamp: "desc" },
      select: { type: true },
    }),
    tx.timeEntry.findFirst({
      where: { employeeId, ...(idFilter ? { id: idFilter } : {}), timestamp: { gt: clockOut } },
      orderBy: { timestamp: "asc" },
      select: { type: true },
    }),
  ]);
  return inside > 0 || previous?.type === "CLOCK_IN" || next?.type === "CLOCK_OUT";
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
            imageMimeType: true,
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
          hasImage: Boolean(item.imageMimeType),
          imageVersion: item.updatedAt.getTime().toString(),
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

    if (parsed.data.vue === "employees") {
      const employees = await db.user.findMany({
        where: { role: "EMPLOYEE", deletedAt: null },
        orderBy: { name: "asc" },
        select: {
          id: true,
          identifier: true,
          name: true,
          hourlyRate: true,
          canStock: true,
          pinHash: true,
          createdAt: true,
          _count: { select: { shifts: true, timeEntries: true } },
        },
      });
      return json(
        {
          employees: employees.map(({ pinHash, hourlyRate, createdAt, ...employee }) => ({
            ...employee,
            hourlyRate: hourlyRate.toString(),
            hasPin: Boolean(pinHash),
            createdAt: createdAt.toISOString(),
          })),
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
          select: { id: true, type: true, timestamp: true },
        },
      },
    });
    return json(
      {
        month,
        people: people.map((person) => {
          const sessions = buildTimeSessionsWithIds(person.timeEntries);
          return {
            id: person.id,
            name: person.name,
            totalHours: sessions.reduce((total, session) => total + session.durationHours, 0),
            sessions: sessions.reverse().map((session) => ({
              clockInId: session.clockInId,
              clockOutId: session.clockOutId,
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

export async function POST(request: Request) {
  const manager = await authenticateDashboardManager(request);
  if (!manager.ok) return json({ error: manager.error }, manager.status, manager.origin);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Données invalides." }, 400, manager.origin);
  }

  const employee = employeeCreateSchema.safeParse(body);
  if (employee.success) {
    try {
      const existing = await db.user.findUnique({ where: { identifier: employee.data.identifier } });
      if (existing) return json({ error: "Cet identifiant est déjà utilisé." }, 409, manager.origin);
      const [passwordHash, pinHash] = await Promise.all([
        bcrypt.hash(employee.data.password, 10),
        employee.data.pin ? bcrypt.hash(employee.data.pin, 10) : Promise.resolve(null),
      ]);
      const created = await db.$transaction(async (tx) => {
        const row = await tx.user.create({
          data: {
            identifier: employee.data.identifier,
            name: employee.data.name,
            passwordHash,
            pinHash,
            role: "EMPLOYEE",
            hourlyRate: employee.data.hourlyRate,
            canStock: employee.data.canStock,
          },
          select: { id: true, identifier: true, name: true, hourlyRate: true, canStock: true },
        });
        await tx.auditLog.create({
          data: auditData({
            action: "user.create.dashboard",
            entity: "User",
            entityId: row.id,
            after: { ...row, hourlyRate: row.hourlyRate.toString(), hasPin: Boolean(pinHash), managerEmail: manager.email },
          }),
        });
        return row;
      });
      return json({ employee: { ...created, hourlyRate: created.hourlyRate.toString(), hasPin: Boolean(pinHash) } }, 201, manager.origin);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return json({ error: "Cet identifiant est déjà utilisé." }, 409, manager.origin);
      }
      console.error("dashboard_employee_create_failed", error);
      return json({ error: "Impossible de créer cet employé." }, 500, manager.origin);
    }
  }

  const shift = shiftInputSchema.omit({ id: true }).safeParse(body);
  if (shift.success) {
    try {
      const created = await db.$transaction(async (tx) => {
        const person = await tx.user.findFirst({
          where: { id: shift.data.employeeId, role: "EMPLOYEE", deletedAt: null },
          select: { id: true },
        });
        if (!person) return null;
        const date = parseDateInput(shift.data.date);
        const nearby = await tx.shift.findMany({
          where: { employeeId: person.id, date: { gte: addDays(date, -1), lte: addDays(date, 1) } },
          select: { date: true, startTime: true, endTime: true },
        });
        const candidate = { date: shift.data.date, startTime: shift.data.startTime, endTime: shift.data.endTime };
        if (nearby.some((row) => datedShiftsOverlap({ ...row, date: toYmd(row.date) }, candidate))) return false;
        const row = await tx.shift.create({
          data: { ...candidate, date, employeeId: person.id, note: shift.data.note || null },
        });
        await tx.auditLog.create({
          data: auditData({
            action: "shift.create.dashboard",
            entity: "Shift",
            entityId: row.id,
            after: { ...candidate, employeeId: person.id, managerEmail: manager.email },
          }),
        });
        return row;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (created === null) return json({ error: "Employé introuvable." }, 404, manager.origin);
      if (created === false) return json({ error: "Ce créneau chevauche un service existant." }, 409, manager.origin);
      return json({ shift: created }, 201, manager.origin);
    } catch (error) {
      console.error("dashboard_shift_create_failed", error);
      return json({ error: "Impossible de créer ce créneau." }, 500, manager.origin);
    }
  }

  const timeSession = timeSessionInputSchema.omit({ clockInId: true, clockOutId: true }).safeParse(body);
  if (timeSession.success) {
    const timestamps = parseTimeSession(timeSession.data);
    if (!timestamps) {
      return json({ error: "La sortie doit suivre l’entrée, avec un service de 36 h maximum." }, 400, manager.origin);
    }
    try {
      const created = await db.$transaction(async (tx) => {
        const person = await tx.user.findFirst({
          where: { id: timeSession.data.employeeId, role: "EMPLOYEE", deletedAt: null },
          select: { id: true },
        });
        if (!person) return null;
        if (await timeSessionConflicts(tx, person.id, timestamps.clockIn, timestamps.clockOut)) return false;
        const clockIn = await tx.timeEntry.create({
          data: { employeeId: person.id, type: "CLOCK_IN", timestamp: timestamps.clockIn },
        });
        const clockOut = await tx.timeEntry.create({
          data: { employeeId: person.id, type: "CLOCK_OUT", timestamp: timestamps.clockOut },
        });
        await tx.auditLog.create({
          data: auditData({
            action: "timeSession.create.dashboard",
            entity: "TimeEntry",
            entityId: clockIn.id,
            after: {
              employeeId: person.id,
              clockInId: clockIn.id,
              clockOutId: clockOut.id,
              clockIn: timestamps.clockIn.toISOString(),
              clockOut: timestamps.clockOut.toISOString(),
              managerEmail: manager.email,
            },
          }),
        });
        return { clockInId: clockIn.id, clockOutId: clockOut.id };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (created === null) return json({ error: "Employé introuvable." }, 404, manager.origin);
      if (created === false) return json({ error: "Ce pointage entre en conflit avec l’historique existant." }, 409, manager.origin);
      return json({ session: created }, 201, manager.origin);
    } catch (error) {
      console.error("dashboard_time_session_create_failed", error);
      return json({ error: "Impossible d’ajouter cette correction de pointage." }, 500, manager.origin);
    }
  }

  return json({ error: "Données invalides." }, 400, manager.origin);
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

  const employee = employeeUpdateSchema.safeParse(body);
  if (employee.success) {
    try {
      const passwordHash = employee.data.password ? await bcrypt.hash(employee.data.password, 10) : undefined;
      const pinHash = employee.data.pin === undefined
        ? undefined
        : employee.data.pin === null
          ? null
          : await bcrypt.hash(employee.data.pin, 10);
      const updated = await db.$transaction(async (tx) => {
        const before = await tx.user.findFirst({
          where: { id: employee.data.id, role: "EMPLOYEE", deletedAt: null },
          select: { id: true, identifier: true, name: true, hourlyRate: true, canStock: true, pinHash: true },
        });
        if (!before) return null;
        const row = await tx.user.update({
          where: { id: before.id },
          data: {
            identifier: employee.data.identifier,
            name: employee.data.name,
            hourlyRate: employee.data.hourlyRate,
            canStock: employee.data.canStock,
            ...(passwordHash ? { passwordHash, sessionVersion: { increment: 1 } } : {}),
            ...(pinHash !== undefined ? { pinHash } : {}),
          },
          select: { id: true, identifier: true, name: true, hourlyRate: true, canStock: true, pinHash: true },
        });
        await tx.auditLog.create({
          data: auditData({
            action: "user.update.dashboard",
            entity: "User",
            entityId: row.id,
            before: { ...before, hourlyRate: before.hourlyRate.toString(), pinHash: undefined, hasPin: Boolean(before.pinHash) },
            after: { ...row, hourlyRate: row.hourlyRate.toString(), pinHash: undefined, hasPin: Boolean(row.pinHash), managerEmail: manager.email },
          }),
        });
        return row;
      });
      if (!updated) return json({ error: "Employé introuvable." }, 404, manager.origin);
      return json({ employee: { ...updated, hourlyRate: updated.hourlyRate.toString(), pinHash: undefined, hasPin: Boolean(updated.pinHash) } }, 200, manager.origin);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return json({ error: "Cet identifiant est déjà utilisé." }, 409, manager.origin);
      }
      console.error("dashboard_employee_update_failed", error);
      return json({ error: "Impossible de modifier cet employé." }, 500, manager.origin);
    }
  }

  const shift = shiftInputSchema.required({ id: true }).safeParse(body);
  if (shift.success) {
    try {
      const updated = await db.$transaction(async (tx) => {
        const before = await tx.shift.findUnique({ where: { id: shift.data.id } });
        if (!before) return null;
        const person = await tx.user.findFirst({ where: { id: shift.data.employeeId, role: "EMPLOYEE", deletedAt: null } });
        if (!person) return false;
        const date = parseDateInput(shift.data.date);
        const nearby = await tx.shift.findMany({
          where: {
            id: { not: before.id },
            employeeId: person.id,
            date: { gte: addDays(date, -1), lte: addDays(date, 1) },
          },
          select: { date: true, startTime: true, endTime: true },
        });
        const candidate = { date: shift.data.date, startTime: shift.data.startTime, endTime: shift.data.endTime };
        if (nearby.some((row) => datedShiftsOverlap({ ...row, date: toYmd(row.date) }, candidate))) return "overlap" as const;
        const row = await tx.shift.update({
          where: { id: before.id },
          data: { employeeId: person.id, date, startTime: shift.data.startTime, endTime: shift.data.endTime, note: shift.data.note || null },
        });
        await tx.auditLog.create({
          data: auditData({
            action: "shift.update.dashboard",
            entity: "Shift",
            entityId: row.id,
            before,
            after: { ...candidate, employeeId: person.id, note: shift.data.note || null, managerEmail: manager.email },
          }),
        });
        return row;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (updated === null) return json({ error: "Créneau introuvable." }, 404, manager.origin);
      if (updated === false) return json({ error: "Employé introuvable." }, 404, manager.origin);
      if (updated === "overlap") return json({ error: "Ce créneau chevauche un service existant." }, 409, manager.origin);
      return json({ shift: updated }, 200, manager.origin);
    } catch (error) {
      console.error("dashboard_shift_update_failed", error);
      return json({ error: "Impossible de modifier ce créneau." }, 500, manager.origin);
    }
  }

  const timeSession = timeSessionInputSchema.extend({ clockInId: z.string().trim().min(1) }).safeParse(body);
  if (timeSession.success) {
    const timestamps = parseTimeSession(timeSession.data);
    if (!timestamps) {
      return json({ error: "La sortie doit suivre l’entrée, avec un service de 36 h maximum." }, 400, manager.origin);
    }
    try {
      const updated = await db.$transaction(async (tx) => {
        const entryIds = [timeSession.data.clockInId, timeSession.data.clockOutId].filter((id): id is string => Boolean(id));
        const before = await tx.timeEntry.findMany({
          where: { id: { in: entryIds } },
          orderBy: { timestamp: "asc" },
        });
        const clockInBefore = before.find((entry) => entry.id === timeSession.data.clockInId);
        const clockOutBefore = before.find((entry) => entry.id === timeSession.data.clockOutId);
        if (
          !clockInBefore || clockInBefore.type !== "CLOCK_IN" ||
          (timeSession.data.clockOutId && (
            !clockOutBefore || clockOutBefore.type !== "CLOCK_OUT" || clockInBefore.employeeId !== clockOutBefore.employeeId
          ))
        ) return null;
        const person = await tx.user.findFirst({
          where: { id: timeSession.data.employeeId, role: "EMPLOYEE", deletedAt: null },
          select: { id: true },
        });
        if (!person) return false;
        const excludedIds = [clockInBefore.id, ...(clockOutBefore ? [clockOutBefore.id] : [])];
        if (await timeSessionConflicts(tx, person.id, timestamps.clockIn, timestamps.clockOut, excludedIds)) {
          return "conflict" as const;
        }
        const [, clockOutAfter] = await Promise.all([
          tx.timeEntry.update({ where: { id: clockInBefore.id }, data: { employeeId: person.id, timestamp: timestamps.clockIn } }),
          clockOutBefore ? tx.timeEntry.update({
            where: { id: clockOutBefore.id },
            data: { employeeId: person.id, timestamp: timestamps.clockOut },
          }) : tx.timeEntry.create({ data: { employeeId: person.id, type: "CLOCK_OUT", timestamp: timestamps.clockOut } }),
        ]);
        await tx.auditLog.create({
          data: auditData({
            action: "timeSession.update.dashboard",
            entity: "TimeEntry",
            entityId: clockInBefore.id,
            before: {
              employeeId: clockInBefore.employeeId,
              clockInId: clockInBefore.id,
              clockOutId: clockOutBefore?.id ?? null,
              clockIn: clockInBefore.timestamp.toISOString(),
              clockOut: clockOutBefore?.timestamp.toISOString() ?? null,
            },
            after: {
              employeeId: person.id,
              clockInId: clockInBefore.id,
              clockOutId: clockOutAfter.id,
              clockIn: timestamps.clockIn.toISOString(),
              clockOut: timestamps.clockOut.toISOString(),
              managerEmail: manager.email,
            },
          }),
        });
        return { clockInId: clockInBefore.id, clockOutId: clockOutAfter.id };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (updated === null) return json({ error: "Session de pointage introuvable." }, 404, manager.origin);
      if (updated === false) return json({ error: "Employé introuvable." }, 404, manager.origin);
      if (updated === "conflict") return json({ error: "Ce pointage entre en conflit avec l’historique existant." }, 409, manager.origin);
      return json({ session: updated }, 200, manager.origin);
    } catch (error) {
      console.error("dashboard_time_session_update_failed", error);
      return json({ error: "Impossible de corriger cette session de pointage." }, 500, manager.origin);
    }
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

export async function DELETE(request: Request) {
  const manager = await authenticateDashboardManager(request);
  if (!manager.ok) return json({ error: manager.error }, manager.status, manager.origin);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Données invalides." }, 400, manager.origin);
  }
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Données invalides." }, 400, manager.origin);

  try {
    if (parsed.data.resource === "timeSession") {
      const deletion = parsed.data;
      const removed = await db.$transaction(async (tx) => {
        const entryIds = [deletion.clockInId, deletion.clockOutId].filter((id): id is string => Boolean(id));
        const before = await tx.timeEntry.findMany({
          where: { id: { in: entryIds } },
          orderBy: { timestamp: "asc" },
        });
        const clockIn = before.find((entry) => entry.id === deletion.clockInId);
        const clockOut = before.find((entry) => entry.id === deletion.clockOutId);
        if (
          !clockIn || clockIn.type !== "CLOCK_IN" || clockIn.employeeId !== deletion.employeeId ||
          (deletion.clockOutId && (!clockOut || clockOut.type !== "CLOCK_OUT" || clockOut.employeeId !== deletion.employeeId))
        ) return null;
        await tx.timeEntry.deleteMany({ where: { id: { in: entryIds } } });
        await tx.auditLog.create({
          data: auditData({
            action: "timeSession.delete.dashboard",
            entity: "TimeEntry",
            entityId: clockIn.id,
            before: {
              employeeId: clockIn.employeeId,
              clockInId: clockIn.id,
              clockOutId: clockOut?.id ?? null,
              clockIn: clockIn.timestamp.toISOString(),
              clockOut: clockOut?.timestamp.toISOString() ?? null,
            },
            after: { deleted: true, managerEmail: manager.email },
          }),
        });
        return true;
      });
      if (!removed) return json({ error: "Session de pointage introuvable." }, 404, manager.origin);
      return json({ ok: true }, 200, manager.origin);
    }

    if (parsed.data.resource === "employee") {
      const deletion = parsed.data;
      const archived = await db.$transaction(async (tx) => {
        const before = await tx.user.findFirst({
          where: { id: deletion.id, role: "EMPLOYEE", deletedAt: null },
          select: { id: true, identifier: true, name: true, canStock: true },
        });
        if (!before) return null;
        await tx.user.update({
          where: { id: before.id },
          data: { deletedAt: new Date(), sessionVersion: { increment: 1 }, canStock: false },
        });
        await tx.auditLog.create({
          data: auditData({
            action: "user.archive.dashboard",
            entity: "User",
            entityId: before.id,
            before,
            after: { deleted: true, managerEmail: manager.email },
          }),
        });
        return before;
      });
      if (!archived) return json({ error: "Employé introuvable." }, 404, manager.origin);
      return json({ ok: true }, 200, manager.origin);
    }

    const deletion = parsed.data;
    const removed = await db.$transaction(async (tx) => {
      const before = await tx.shift.findUnique({ where: { id: deletion.id } });
      if (!before) return null;
      await tx.shift.delete({ where: { id: before.id } });
      await tx.auditLog.create({
        data: auditData({
          action: "shift.delete.dashboard",
          entity: "Shift",
          entityId: before.id,
          before,
          after: { managerEmail: manager.email },
        }),
      });
      return before;
    });
    if (!removed) return json({ error: "Créneau introuvable." }, 404, manager.origin);
    return json({ ok: true }, 200, manager.origin);
  } catch (error) {
    console.error("dashboard_delete_failed", error);
    return json({ error: "Cette suppression n’a pas pu être effectuée." }, 500, manager.origin);
  }
}
