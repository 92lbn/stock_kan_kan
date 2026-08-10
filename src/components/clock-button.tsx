"use client";

import { useState, useTransition } from "react";
import { clockAction } from "@/lib/actions/planning";
import { Button } from "@stock-kan-kan/ui/button";

export function ClockButton({ isClockedIn }: { isClockedIn: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick(type: "CLOCK_IN" | "CLOCK_OUT") {
    setError(null);
    startTransition(async () => {
      const result = await clockAction(type);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      {isClockedIn ? (
        <Button
          variant="danger"
          disabled={isPending}
          onClick={() => handleClick("CLOCK_OUT")}
          className="h-14 px-8 text-base"
        >
          Pointer le départ
        </Button>
      ) : (
        <Button
          disabled={isPending}
          onClick={() => handleClick("CLOCK_IN")}
          className="h-14 px-8 text-base"
        >
          Pointer l&apos;arrivée
        </Button>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
