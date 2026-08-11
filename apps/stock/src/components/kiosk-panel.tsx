"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { kioskClockAction } from "@/lib/actions/kiosk";
import { cn } from "@stock-kan-kan/lib/utils";

export type KioskEmployee = {
  id: string;
  name: string;
  isClockedIn: boolean;
  todayHours: string;
};

export function KioskPanel({ employees }: { employees: KioskEmployee[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const selected = employees.find((employee) => employee.id === selectedId) ?? null;
  const handleSuccess = useCallback((name: string, type: "CLOCK_IN" | "CLOCK_OUT") => {
    setConfirmation(
      type === "CLOCK_IN" ? `Arrivée de ${name} enregistrée.` : `Départ de ${name} enregistré.`
    );
    setSelectedId(null);
  }, []);

  if (employees.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-card p-6 text-center">
        <p className="font-medium text-ink">Aucun PIN de pointage configuré.</p>
        <p className="mt-2 text-sm text-muted">
          Un responsable peut ajouter un PIN depuis la fiche de l’employé dans Planning.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="sr-only" aria-live="polite">{confirmation}</p>
      {confirmation && (
        <div className="rounded-xl border border-positive/40 bg-positive/10 p-4 text-center font-medium text-positive">
          {confirmation}
        </div>
      )}

      <section aria-labelledby="employee-title">
        <h2 id="employee-title" className="mb-3 text-lg font-semibold text-ink">
          Qui pointe ?
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {employees.map((employee) => (
            <button
              key={employee.id}
              type="button"
              aria-pressed={selectedId === employee.id}
              onClick={() => {
                setConfirmation("");
                setSelectedId(employee.id);
              }}
              className={cn(
                "min-h-24 rounded-xl border p-4 text-left shadow-sm transition active:scale-[0.98]",
                "focus-visible:ring-3 focus-visible:ring-accent focus-visible:ring-offset-2",
                selectedId === employee.id
                  ? "border-accent bg-accent/10"
                  : "border-line bg-card hover:border-line-strong"
              )}
            >
              <span className="block text-lg font-semibold text-ink">{employee.name}</span>
              <span className={cn("mt-2 block text-sm font-medium", employee.isClockedIn ? "text-positive" : "text-muted")}>
                {employee.isClockedIn ? "● En service" : "Hors service"}
              </span>
              <span className="mt-1 block text-xs text-muted">Aujourd’hui : {employee.todayHours} h</span>
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <KioskPinForm key={selected.id} employee={selected} onCancel={() => setSelectedId(null)} onSuccess={handleSuccess} />
      )}
    </div>
  );
}

function KioskPinForm({
  employee,
  onCancel,
  onSuccess,
}: {
  employee: KioskEmployee;
  onCancel: () => void;
  onSuccess: (name: string, type: "CLOCK_IN" | "CLOCK_OUT") => void;
}) {
  const [state, formAction, pending] = useActionState(kioskClockAction, undefined);
  const [pin, setPin] = useState("");
  const wasPending = useRef(false);
  const inputId = useId();
  const errorId = useId();
  const type = employee.isClockedIn ? "CLOCK_OUT" : "CLOCK_IN";

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onSuccess(employee.name, type);
    wasPending.current = pending;
  }, [employee.name, onSuccess, pending, state, type]);

  function appendDigit(digit: string) {
    setPin((current) => (current.length < 6 ? current + digit : current));
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-line bg-card p-5 shadow-lg" aria-labelledby={`${inputId}-title`}>
      <h2 id={`${inputId}-title`} className="text-center text-xl font-semibold text-ink">{employee.name}</h2>
      <p className="mt-1 text-center text-sm text-muted">
        Saisissez votre PIN pour pointer {type === "CLOCK_IN" ? "l’arrivée" : "le départ"}.
      </p>

      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="employeeId" value={employee.id} />
        <input type="hidden" name="type" value={type} />
        <label className="sr-only" htmlFor={inputId}>PIN personnel</label>
        <input
          id={inputId}
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]{4,6}"
          minLength={4}
          maxLength={6}
          required
          autoFocus
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
          aria-describedby={state?.error ? errorId : undefined}
          className="h-16 w-full rounded-xl border border-line-strong bg-surface px-4 text-center text-3xl tracking-[0.45em] text-ink focus:border-accent"
        />

        <div className="grid grid-cols-3 gap-2" aria-label="Pavé numérique">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button key={digit} type="button" onClick={() => appendDigit(digit)} className="min-h-16 rounded-xl bg-card-2 text-2xl font-semibold text-ink active:bg-accent/15">
              {digit}
            </button>
          ))}
          <button type="button" onClick={() => setPin("")} className="min-h-16 rounded-xl bg-card-2 text-sm font-medium text-muted">Effacer</button>
          <button type="button" onClick={() => appendDigit("0")} className="min-h-16 rounded-xl bg-card-2 text-2xl font-semibold text-ink">0</button>
          <button type="button" aria-label="Effacer le dernier chiffre" onClick={() => setPin((current) => current.slice(0, -1))} className="min-h-16 rounded-xl bg-card-2 text-xl font-medium text-muted">
            ⌫
          </button>
        </div>

        {state?.error && <p id={errorId} role="alert" className="text-center text-sm font-medium text-danger">{state.error}</p>}

        <button type="submit" disabled={pending || pin.length < 4} className={cn(
          "min-h-16 w-full rounded-xl px-6 text-lg font-semibold text-white shadow-sm disabled:opacity-50",
          type === "CLOCK_IN" ? "bg-positive" : "bg-danger"
        )}>
          {pending ? "Enregistrement…" : type === "CLOCK_IN" ? "Pointer l’arrivée" : "Pointer le départ"}
        </button>
        <button type="button" onClick={onCancel} className="min-h-11 w-full rounded-lg text-sm font-medium text-muted">Changer de personne</button>
      </form>
    </section>
  );
}
