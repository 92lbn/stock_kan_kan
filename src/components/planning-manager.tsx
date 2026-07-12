"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { ShiftForm } from "@/components/shift-form";
import { Card } from "@/components/ui/card";
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
          Assigner un créneau
        </h2>
        {employees.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Ajoutez d&apos;abord des employés dans la page Employés.
          </p>
        ) : (
          <ShiftForm employees={employees} defaultDate={selectedDate} />
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
          Calendrier du mois
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Clique sur un jour pour pré-remplir le formulaire, clique sur un créneau pour le
          supprimer.
        </p>
        <PlanningCalendar
          events={events}
          onDateClick={setSelectedDate}
          onEventClick={handleEventClick}
        />
        {isPending && <p className="mt-2 text-xs text-zinc-500">Suppression...</p>}
      </Card>
    </>
  );
}
