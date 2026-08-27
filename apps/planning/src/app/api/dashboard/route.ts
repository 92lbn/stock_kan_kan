import { db } from "@stock-kan-kan/db";
import { weekRangeOf, weekStart, toYmd, wallTimeParisToUtc, toYearMonth } from "@stock-kan-kan/lib/date";
import { buildTimeSessions, sumShiftHours } from "@stock-kan-kan/lib/hours";
import { z } from "zod";
import { authenticateDashboardManager, dashboardCorsHeaders } from "@/lib/dashboard-api-auth";

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
]);

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

