"use client";

import { useMemo, useState } from "react";
import { StockRow } from "@/components/stock-row";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type StockItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minThreshold: number;
};

const FILTERS = [
  { value: "ALL", label: "Tout" },
  { value: "EPICERIE", label: "Épicerie" },
  { value: "LEGUMES_FRAIS", label: "Légumes" },
  { value: "VIANDES_POISSONS", label: "Viandes" },
  { value: "BOISSONS", label: "Boissons" },
  { value: "MENAGER_ENTRETIEN", label: "Ménager" },
  { value: "CONSOMMABLES_EMBALLAGES", label: "Emballages" },
];

export function StockList({ items }: { items: StockItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [lowOnly, setLowOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "ALL" && item.category !== category) return false;
      if (lowOnly && !(item.minThreshold > 0 && item.quantity <= item.minThreshold)) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, category, lowOnly]);

  const lowCount = items.filter(
    (i) => i.minThreshold > 0 && i.quantity <= i.minThreshold
  ).length;

  return (
    <div className="space-y-4">
      <Input
        placeholder="Rechercher un produit..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setCategory(f.value)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium",
              category === f.value
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-600"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {lowCount > 0 && (
        <button
          type="button"
          onClick={() => setLowOnly((v) => !v)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium",
            lowOnly
              ? "border-amber-500 bg-amber-500 text-white"
              : "border-amber-300 bg-amber-50 text-amber-800"
          )}
        >
          ⚠️ {lowCount} sous le seuil{lowOnly ? " (filtré)" : ""}
        </button>
      )}

      <p className="text-xs text-zinc-500">
        {filtered.length} produit{filtered.length > 1 ? "s" : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun produit ne correspond.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((item) => (
            <StockRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
