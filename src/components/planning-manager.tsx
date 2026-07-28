"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ShiftForm } from "@/components/shift-form";
import { BulkShiftForm } from "@/components/bulk-shift-form";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { deleteShift } from "@/lib/actions/planning";
import { MonthCalendar, type CalendarEvent } from "@/components/month-calendar";

type Employee = { id: string; name: string };

export function PlanningManager({
  employees,
  events,
  month,
}: {
  employees: Employee[];
  events: CalendarEvent[];
  month: string;
}) {
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [isPending, startTransition] = useTransition();

  // Le créneau disparaît du calendrier dès le clic, avant la confirmation serveur.
  const [optimisticEvents, removeEvent] = useOptimistic(events, (evts, removedId: string) =>
    evts.filter((e) => e.id !== removedId)
  );

  function handleEventClick(eventId: string) {
    if (!confirm("Supprimer ce créneau ?")) return;
    startTransition(async () => {
      removeEvent(eventId);
      await deleteShift(eventId);
    });
  }

  return (
    <>
      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
          Assigner des créneaux
        </h2>
        {employees.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Ajoutez d&apos;abord des employés dans la page Employés.
          </p>
        ) : (
          <>
            <div className="mb-4 inline-flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setMode("single")}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium",
                  mode === "single"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400"
                )}
              >
                Un créneau
              </button>
              <button
                type="button"
                onClick={() => setMode("bulk")}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium",
                  mode === "bulk"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400"
                )}
              >
                Plusieurs jours
              </button>
            </div>

            {mode === "single" ? (
              <ShiftForm employees={employees} defaultDate={selectedDate} />
            ) : (
              <BulkShiftForm employees={employees} />
            )}
          </>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
          Calendrier du mois
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Clique sur un jour pour pré-remplir le formulaire &quot;un créneau&quot;, clique sur un
          créneau pour le supprimer.
        </p>
        <MonthCalendar
          events={optimisticEvents}
          month={month}
          onDateClick={(date) => {
            setSelectedDate(date);
            setMode("single");
          }}
          onEventClick={handleEventClick}
        />
        {isPending && <p className="mt-2 text-xs text-zinc-500">Suppression...</p>}
      </Card>
    </>
  );
}
