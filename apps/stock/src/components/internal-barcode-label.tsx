"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { createInternalBarcode, type BarcodeActionState } from "@/lib/actions/stock";
import { encodeCode128B } from "@/lib/code128";
import { Button } from "@stock-kan-kan/ui/button";

export function InternalBarcodeLabel({ itemId, itemName, barcode }: { itemId: string; itemName: string; barcode: string }) {
  const [state, action, pending] = useActionState<BarcodeActionState, FormData>(
    createInternalBarcode.bind(null, itemId),
    undefined,
  );
  const generatedBarcode = state?.barcode ?? (barcode.startsWith("KAN-") ? barcode : "");
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state?.barcode) {
      document.getElementById(`barcode-label-${itemId}`)?.focus();
    }
    wasPending.current = pending;
  }, [itemId, pending, state?.barcode]);

  if (!generatedBarcode) {
    return (
      <form action={action} className="rounded-lg border border-dashed border-line-strong p-3">
        <p className="text-sm font-medium text-ink">Produit sans code-barres</p>
        <p className="mt-1 text-sm text-muted">Crée une étiquette interne à coller sur le bac ou l’étagère.</p>
        {state?.error && <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p>}
        <Button type="submit" variant="secondary" disabled={pending} className="mt-3 min-h-11 w-full">
          {pending ? "Création…" : "Créer une étiquette code-barres"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      <div id={`barcode-label-${itemId}`} tabIndex={-1} className="barcode-print-area mx-auto w-[320px] max-w-full bg-white p-4 text-center text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <p className="truncate text-base font-bold">kan·kan · {itemName}</p>
        <Code128Barcode value={generatedBarcode} />
        <p className="mt-1 font-mono text-xs tracking-wider">{generatedBarcode}</p>
      </div>
      <p className="text-sm text-muted">Le scanner reconnaît désormais cette étiquette comme celle de « {itemName} ».</p>
      <Button type="button" variant="secondary" className="min-h-11 w-full" onClick={() => window.print()}>
        Imprimer l’étiquette
      </Button>
    </div>
  );
}

function Code128Barcode({ value }: { value: string }) {
  const barcode = useMemo(() => {
    const { patterns } = encodeCode128B(value);
    let x = 10;
    const bars: { x: number; width: number }[] = [];
    for (const pattern of patterns) {
      [...pattern].forEach((digit, index) => {
        const width = Number(digit);
        if (index % 2 === 0) bars.push({ x, width });
        x += width;
      });
    }
    return { bars, width: x + 10 };
  }, [value]);

  return (
    <svg role="img" aria-label={`Code-barres interne ${value}`} viewBox={`0 0 ${barcode.width} 64`} className="mt-2 h-20 w-full" preserveAspectRatio="none">
      <rect width={barcode.width} height="64" fill="white" />
      {barcode.bars.map((bar, index) => <rect key={`${bar.x}-${index}`} x={bar.x} y="0" width={bar.width} height="64" fill="black" />)}
    </svg>
  );
}
