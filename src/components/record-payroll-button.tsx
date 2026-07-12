"use client";

import { useState, useTransition } from "react";
import { recordPayrollAsExpense } from "@/lib/actions/ledger";
import { Button } from "@/components/ui/button";

export function RecordPayrollButton({ amount, label }: { amount: number; label: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Enregistrer ${amount.toFixed(2)} € de salaires comme dépense ce mois-ci ?`))
      return;
    setError(null);
    startTransition(async () => {
      const result = await recordPayrollAsExpense(amount, label);
      if (result?.error) setError(result.error);
      else setDone(true);
    });
  }

  if (done) {
    return <p className="text-sm text-emerald-600 dark:text-emerald-400">Paye enregistrée en dépense ✓</p>;
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={isPending || amount <= 0} variant="secondary">
        {isPending ? "Enregistrement..." : "Enregistrer la paye réelle comme dépense"}
      </Button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
