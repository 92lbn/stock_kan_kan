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

export function sumShiftHours(shifts: { startTime: string; endTime: string }[]) {
  return shifts.reduce((total, shift) => {
    const [startH, startM] = shift.startTime.split(":").map(Number);
    const [endH, endM] = shift.endTime.split(":").map(Number);
    const minutes = endH * 60 + endM - (startH * 60 + startM);
    return total + Math.max(minutes, 0) / 60;
  }, 0);
}
