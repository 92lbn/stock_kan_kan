import type { TimeEntryModel } from "@stock-kan-kan/db/models";

// Pairs consecutive CLOCK_IN/CLOCK_OUT entries (already sorted ascending by timestamp)
// and sums the duration in hours. An unmatched trailing CLOCK_IN is ignored.
export function computeTotalHours(entries: Pick<TimeEntryModel, "type" | "timestamp">[]) {
  let totalMs = 0;
  let openClockIn: Date | null = null;

  for (const entry of entries) {
    if (entry.type === "CLOCK_IN") {
      openClockIn = entry.timestamp;
    } else if (entry.type === "CLOCK_OUT" && openClockIn) {
      totalMs += entry.timestamp.getTime() - openClockIn.getTime();
      openClockIn = null;
    }
  }

  return totalMs / (1000 * 60 * 60);
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Deux créneaux (même jour) se chevauchent-ils ? Gère le passage de minuit en
// normalisant une fin <= début sur +24h.
export function shiftsOverlap(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string }
) {
  const aStart = toMinutes(a.startTime);
  let aEnd = toMinutes(a.endTime);
  if (aEnd < aStart) aEnd += 24 * 60;
  const bStart = toMinutes(b.startTime);
  let bEnd = toMinutes(b.endTime);
  if (bEnd < bStart) bEnd += 24 * 60;
  if (aEnd === aStart || bEnd === bStart) return false;
  return aStart < bEnd && bStart < aEnd;
}

export function datedShiftsOverlap(
  a: { date: string; startTime: string; endTime: string },
  b: { date: string; startTime: string; endTime: string }
) {
  const interval = (shift: typeof a) => {
    const day = Date.parse(`${shift.date}T00:00:00Z`) / 60000;
    const start = day + toMinutes(shift.startTime);
    let end = day + toMinutes(shift.endTime);
    if (end < start) end += 1440;
    return { start, end };
  };
  const ia = interval(a);
  const ib = interval(b);
  if (ia.start === ia.end || ib.start === ib.end) return false;
  return ia.start < ib.end && ib.start < ia.end;
}

export function sumShiftHours(shifts: { startTime: string; endTime: string }[]) {
  return shifts.reduce((total, shift) => {
    const [startH, startM] = shift.startTime.split(":").map(Number);
    const [endH, endM] = shift.endTime.split(":").map(Number);
    let minutes = endH * 60 + endM - (startH * 60 + startM);
    // Créneau qui passe minuit (ex. 18:00 → 02:00) : endTime < startTime donne un
    // nombre négatif ; on ajoute une journée. Un créneau de durée nulle reste 0.
    if (minutes < 0) {
      minutes += 24 * 60;
    }
    return total + minutes / 60;
  }, 0);
}
