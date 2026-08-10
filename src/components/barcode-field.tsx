"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Input } from "@stock-kan-kan/ui/input";
import { Sheet } from "@stock-kan-kan/ui/sheet";

// ZXing chargé seulement à l'ouverture du scanner.
const BarcodeScanner = dynamic(
  () => import("@/components/barcode-scanner").then((m) => m.BarcodeScanner),
  { ssr: false, loading: () => <p className="py-8 text-center text-sm text-muted">Démarrage de la caméra…</p> }
);

// Champ code-barres avec bouton « scanner » : remplit le champ par la caméra
// au lieu de saisir l'EAN à la main.
export function BarcodeField({
  name,
  id,
  defaultValue = "",
}: {
  name: string;
  id?: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [scanOpen, setScanOpen] = useState(false);

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        name={name}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="EAN / code-barres"
        className="flex-1"
      />
      <button
        type="button"
        onClick={() => setScanOpen(true)}
        aria-label="Scanner le code-barres"
        className="grid h-11 w-11 flex-none place-items-center rounded-md border border-line-strong bg-card text-lg text-ink hover:bg-card-2"
      >
        ▣
      </button>

      <Sheet open={scanOpen} onClose={() => setScanOpen(false)} title="Scanner le code-barres">
        <div className="pb-2">
          <BarcodeScanner
            onDetected={(code) => {
              setValue(code);
              setScanOpen(false);
            }}
          />
        </div>
      </Sheet>
    </div>
  );
}
