"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { ShiftForm } from "@/components/shift-form";
import { BulkShiftForm } from "@/components/bulk-shift-form";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { deleteShift } from "@/lib/actions/planning";
import type { CalendarEvent } from "@/components/planning-calendar";

const PlanningCalendar = dynamic(
  () => import("@/components/planning-calendar").then((mod) => mod.PlanningCalendar),
  { ssr: false, loading: () => <p className="text-sm text-zinc-500">Chargement du calendrier...</p> }
);

type Employee = { id: string; name: string };

export function PlanningManager({
  employees,
  events,
}: {
  employees: Employee[];
  events: CalendarEvent[];
}) {
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [isPending, startTransition] = useTransition();

  function handleEventClick(eventId: string) {
    if (!confirm("Supprimer ce créneau ?")) return;
    startTransition(async () => {
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
        <PlanningCalendar
          events={events}
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
