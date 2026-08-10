"use client";

import { useState, useTransition } from "react";
import { cn } from "@stock-kan-kan/lib/utils";
import { deleteShift } from "@/lib/actions/planning";
import { MonthCalendar, type CalendarEvent } from "@/components/month-calendar";
import { ShiftForm } from "@/components/shift-form";
import { BulkShiftForm } from "@/components/bulk-shift-form";
import { Sheet } from "@stock-kan-kan/ui/sheet";
import { ConfirmAction } from "@stock-kan-kan/ui/confirm-action";

export type BoardShift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
};
export type BoardDay = { ymd: string; label: string; hours: number; shifts: BoardShift[] };
type Employee = { id: string; name: string };

export function PlanningBoard({
  view,
  days,
  events,
  month,
  employees,
  canEdit,
  today,
}: {
  view: "semaine" | "mois";
  days: BoardDay[];
  events: CalendarEvent[];
  month: string;
  employees: Employee[];
  canEdit: boolean;
  today: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState<string | undefined>(undefined);
  const [addMode, setAddMode] = useState<"single" | "bulk">("single");
  const [, startTransition] = useTransition();

  function openAdd(date?: string) {
    setAddDate(date);
    setAddMode("single");
    setAddOpen(true);
  }

  function handleEventClick(id: string) {
    if (!confirm("Supprimer ce créneau ?")) return;
    startTransition(() => {
      deleteShift(id);
    });
  }

  return (
    <div>
      {view === "semaine" ? (
        <div className="space-y-2">
          {days.map((day) => {
            const isToday = day.ymd === today;
            return (
              <div
                key={day.ymd}
                className={cn(
                  "rounded-xl border bg-card shadow-sm",
                  isToday ? "border-accent" : "border-line"
                )}
              >
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className={cn("font-semibold capitalize", isToday ? "text-accent" : "text-ink")}>
                      {day.label}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        aujourd&apos;hui
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    {day.hours > 0 && (
                      <span className="num text-sm text-muted">{day.hours.toFixed(1)} h</span>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openAdd(day.ymd)}
                        aria-label={`Ajouter un créneau ${day.label}`}
                        className="grid h-7 w-7 place-items-center rounded-md border border-line text-muted hover:bg-card-2 hover:text-ink"
                      >
                        +
                      </button>
                    )}
                  </span>
                </div>
                {day.shifts.length > 0 && (
                  <ul className="divide-y divide-line border-t border-line">
                    {day.shifts.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span
                          className="h-2.5 w-2.5 flex-none rounded-full"
                          style={{ backgroundColor: s.color }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">{s.name}</span>
                        <span className="num text-sm text-muted">
                          {s.startTime}–{s.endTime}
                        </span>
                        {canEdit && (
                          <ConfirmAction
                            action={deleteShift.bind(null, s.id)}
                            title="Supprimer ce créneau ?"
                            message={`${s.name} — ${day.label} ${s.startTime}–${s.endTime}`}
                            triggerLabel="✕"
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-card p-3 shadow-sm">
          <MonthCalendar
            events={events}
            month={month}
            onDateClick={canEdit ? (d) => openAdd(d) : undefined}
            onEventClick={canEdit ? handleEventClick : undefined}
          />
          {canEdit && (
            <p className="mt-2 text-center text-xs text-muted">
              Touche un jour pour ajouter, un créneau pour le supprimer.
            </p>
          )}
        </div>
      )}

      {canEdit && (
        <>
          <button
            type="button"
            onClick={() => openAdd(view === "semaine" ? days[0]?.ymd : undefined)}
            aria-label="Ajouter un créneau"
            className="fixed bottom-24 right-4 z-20 grid h-14 w-14 place-items-center rounded-full bg-accent text-2xl text-accent-ink shadow-lg transition-transform active:scale-95 sm:bottom-8"
          >
            +
          </button>

          <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Nouveau créneau">
            <div className="space-y-3 pb-2">
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1">
                <button
                  type="button"
                  onClick={() => setAddMode("single")}
                  className={cn(
                    "rounded-md py-2 text-sm font-medium",
                    addMode === "single" ? "bg-accent text-accent-ink" : "text-muted"
                  )}
                >
                  Un jour
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("bulk")}
                  className={cn(
                    "rounded-md py-2 text-sm font-medium",
                    addMode === "bulk" ? "bg-accent text-accent-ink" : "text-muted"
                  )}
                >
                  Plusieurs jours
                </button>
              </div>
              {addMode === "single" ? (
                <ShiftForm
                  employees={employees}
                  defaultDate={addDate}
                  onDone={() => setAddOpen(false)}
                />
              ) : (
                <BulkShiftForm employees={employees} onDone={() => setAddOpen(false)} />
              )}
            </div>
          </Sheet>
        </>
      )}
    </div>
  );
}
