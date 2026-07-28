import type { TimeEntryModel } from "@/generated/prisma/models";

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
  if (aEnd <= aStart) aEnd += 24 * 60;
  const bStart = toMinutes(b.startTime);
  let bEnd = toMinutes(b.endTime);
  if (bEnd <= bStart) bEnd += 24 * 60;
  return aStart < bEnd && bStart < aEnd;
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
