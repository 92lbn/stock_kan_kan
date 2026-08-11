import "server-only";

import bcrypt from "bcryptjs";
import { db } from "@stock-kan-kan/db";
import { expectedClockAction } from "@stock-kan-kan/lib/hours";
import { auditData } from "@stock-kan-kan/lib/audit";

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_EMPLOYEE_FAILS = 5;
const RATE_MAX_IP_FAILS = 20;
const RATE_MAX_GLOBAL_FAILS = 100;
const DUMMY_PIN_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export type KioskClockInput = {
  employeeId: string;
  pin: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  ip: string;
  stationUserId: string;
};

export async function performKioskClock(input: KioskClockInput): Promise<string | undefined> {
  const attemptKey = `kiosk:${input.employeeId}`;
  const lockKey = `clock:${input.employeeId}`;
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const [employee, employeeFails, ipFails, globalFails] = await Promise.all([
    db.user.findFirst({
      where: { id: input.employeeId, role: "EMPLOYEE", deletedAt: null },
      select: { id: true, pinHash: true },
    }),
    db.loginAttempt.count({ where: { identifier: attemptKey, createdAt: { gte: since } } }),
    db.loginAttempt.count({ where: { ip: input.ip, createdAt: { gte: since } } }),
    db.loginAttempt.count({ where: { createdAt: { gte: since } } }),
  ]);

  if (
    employeeFails >= RATE_MAX_EMPLOYEE_FAILS ||
    ipFails >= RATE_MAX_IP_FAILS ||
    globalFails >= RATE_MAX_GLOBAL_FAILS
  ) {
    return "Trop de tentatives. Réessayez dans une quinzaine de minutes.";
  }

  const pinMatches = await bcrypt.compare(input.pin, employee?.pinHash ?? DUMMY_PIN_HASH);
  if (!employee?.pinHash || !pinMatches) {
    await db.$transaction([
      db.loginAttempt.create({ data: { identifier: attemptKey, ip: input.ip } }),
      db.auditLog.create({
        data: auditData({
          userId: input.stationUserId,
          action: "kiosk.pin.failed",
          entity: "User",
          entityId: input.employeeId,
        }),
      }),
    ]);
    return "Employé ou PIN incorrect.";
  }

  try {
    return await db.$transaction(async (tx) => {
      // Un verrou transactionnel par employé empêche deux appareils de pointer
      // simultanément avant que le dernier état soit relu.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const currentEmployee = await tx.user.findFirst({
        where: { id: employee.id, role: "EMPLOYEE", deletedAt: null },
        select: { pinHash: true },
      });
      if (!currentEmployee?.pinHash || currentEmployee.pinHash !== employee.pinHash) {
        return "Le PIN vient d’être modifié. Recommencez.";
      }

      const last = await tx.timeEntry.findFirst({
        where: { employeeId: employee.id },
        orderBy: { timestamp: "desc" },
        select: { type: true },
      });
      const expected = expectedClockAction(last?.type);
      if (input.type !== expected) {
        return expected === "CLOCK_IN"
          ? "Cette personne est déjà hors service."
          : "Cette personne est déjà en service.";
      }

      const entry = await tx.timeEntry.create({
        data: { employeeId: employee.id, type: input.type },
      });
      await tx.auditLog.create({
        data: auditData({
          userId: input.stationUserId,
          action: input.type === "CLOCK_IN" ? "kiosk.clockIn" : "kiosk.clockOut",
          entity: "TimeEntry",
          entityId: entry.id,
          after: { employeeId: employee.id, timestamp: entry.timestamp, source: "kiosk" },
        }),
      });
      await tx.loginAttempt.deleteMany({ where: { identifier: attemptKey } });
      return undefined;
    });
  } catch (error) {
    console.error("kiosk_clock_failed", error);
    return "Le pointage n’a pas pu être enregistré. Réessayez.";
  }
}

export async function performAuthenticatedClock(input: {
  employeeId: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
}): Promise<string | undefined> {
  const lockKey = `clock:${input.employeeId}`;
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      const employee = await tx.user.findFirst({
        where: { id: input.employeeId, deletedAt: null },
        select: { id: true },
      });
      if (!employee) return "Compte introuvable.";

      const last = await tx.timeEntry.findFirst({
        where: { employeeId: employee.id },
        orderBy: { timestamp: "desc" },
        select: { type: true },
      });
      const expected = expectedClockAction(last?.type);
      if (input.type !== expected) {
        return expected === "CLOCK_IN"
          ? "Vous êtes déjà hors service."
          : "Vous êtes déjà en service.";
      }

      const entry = await tx.timeEntry.create({
        data: { employeeId: employee.id, type: input.type },
      });
      await tx.auditLog.create({
        data: auditData({
          userId: employee.id,
          action: input.type === "CLOCK_IN" ? "pointage.clockIn" : "pointage.clockOut",
          entity: "TimeEntry",
          entityId: entry.id,
          after: { employeeId: employee.id, timestamp: entry.timestamp, source: "mobile" },
        }),
      });
      return undefined;
    });
  } catch (error) {
    console.error("authenticated_clock_failed", error);
    return "Le pointage n’a pas pu être enregistré. Réessayez.";
  }
}
