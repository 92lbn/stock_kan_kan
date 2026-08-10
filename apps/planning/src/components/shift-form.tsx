"use client";

import { useActionState, useEffect, useRef } from "react";
import { createShift } from "@/lib/actions/planning";
import { Button } from "@stock-kan-kan/ui/button";
import { Input, Label, Select } from "@stock-kan-kan/ui/input";

type Employee = { id: string; name: string };

export function ShiftForm({
  employees,
  defaultDate,
  onDone,
}: {
  employees: Employee[];
  defaultDate?: string;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(createShift, undefined);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onDone?.();
    wasPending.current = pending;
  }, [pending, state, onDone]);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-2">
        <Label htmlFor="employeeId">Employé</Label>
        <Select id="employeeId" name="employeeId" required>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="date">Date</Label>
        <Input key={defaultDate} id="date" name="date" type="date" defaultValue={defaultDate} required />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="startTime">Début</Label>
        <Input id="startTime" name="startTime" type="time" required />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="endTime">Fin</Label>
        <Input id="endTime" name="endTime" type="time" required />
      </div>
      <div className="sm:col-span-1 flex items-end">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "..." : "Ajouter"}
        </Button>
      </div>

      {state?.error && (
        <p className="sm:col-span-6 text-sm text-danger">{state.error}</p>
      )}
    </form>
  );
}
