"use client";

import { useActionState, useEffect, useRef } from "react";
import { createShiftsBulk } from "@/lib/actions/planning";
import { Button } from "@stock-kan-kan/ui/button";
import { Input, Label, Select } from "@stock-kan-kan/ui/input";

type Employee = { id: string; name: string };

// value matches JS getUTCDay(): 0 = dimanche ... 6 = samedi
const WEEKDAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 0, label: "Dim" },
];

export function BulkShiftForm({
  employees,
  onDone,
}: {
  employees: Employee[];
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(createShiftsBulk, undefined);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onDone?.();
    wasPending.current = pending;
  }, [pending, state, onDone]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <Label htmlFor="bulk-employee">Employé</Label>
          <Select id="bulk-employee" name="employeeId" required>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-1">
          <Label htmlFor="startDate">Du</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </div>
        <div className="sm:col-span-1">
          <Label htmlFor="endDate">Au</Label>
          <Input id="endDate" name="endDate" type="date" required />
        </div>
        <div className="sm:col-span-1">
          <Label htmlFor="bulk-start">Début</Label>
          <Input id="bulk-start" name="startTime" type="time" required />
        </div>
        <div className="sm:col-span-1">
          <Label htmlFor="bulk-end">Fin</Label>
          <Input id="bulk-end" name="endTime" type="time" required />
        </div>
      </div>

      <div>
        <Label>Jours de la semaine</Label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => (
            <label
              key={d.value}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink hover:bg-card-2"
            >
              <input type="checkbox" name="weekdays" value={d.value} className="accent-[var(--accent)]" />
              {d.label}
            </label>
          ))}
        </div>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Création..." : "Créer les créneaux"}
      </Button>
    </form>
  );
}
