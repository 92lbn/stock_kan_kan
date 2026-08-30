import { useMemo } from "react";
import { encodeCode128B } from "@/lib/code128";

// Rendu SVG d'un CODE 128-B — partagé entre l'étiquette unitaire (fiche produit)
// et l'impression groupée (page Étiquettes).
export function Code128Barcode({ value }: { value: string }) {
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
