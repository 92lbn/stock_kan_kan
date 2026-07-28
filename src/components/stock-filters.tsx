"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Select } from "@/components/ui/input";

const categories = [
  { value: "", label: "Toutes catégories" },
  { value: "EPICERIE", label: "Épicerie / Secs" },
  { value: "LEGUMES_FRAIS", label: "Légumes / Frais" },
  { value: "VIANDES_POISSONS", label: "Viandes / Poissons" },
  { value: "BOISSONS", label: "Boissons" },
  { value: "MENAGER_ENTRETIEN", label: "Ménager / Entretien" },
  { value: "CONSOMMABLES_EMBALLAGES", label: "Consommables / Emballages" },
];

const sorts = [
  { value: "name", label: "Nom (A→Z)" },
  { value: "name_desc", label: "Nom (Z→A)" },
  { value: "quantity", label: "Quantité ↑" },
  { value: "low", label: "Sous seuil d'abord" },
];

// Recherche / filtre / tri pilotés par l'URL (searchParams), sans état serveur.
export function StockFilters({ q, cat, sort }: { q: string; cat: string; sort: string }) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function push(next: { q?: string; cat?: string; sort?: string }) {
    const params = new URLSearchParams();
    const nq = next.q ?? text;
    const ncat = next.cat ?? cat;
    const nsort = next.sort ?? sort;
    if (nq) params.set("q", nq);
    if (ncat) params.set("cat", ncat);
    if (nsort && nsort !== "name") params.set("sort", nsort);
    router.push(`/stock${params.toString() ? `?${params}` : ""}`);
  }

  // Recherche instantanée : on pousse l'URL après une courte pause de frappe.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (text === q) return;
    timer.current = setTimeout(() => push({ q: text }), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="flex flex-wrap gap-2">
      <Input
        type="search"
        placeholder="Rechercher un article…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-10 flex-1 min-w-40"
        aria-label="Rechercher un article"
      />
      <Select
        value={cat}
        onChange={(e) => push({ cat: e.target.value })}
        className="h-10 w-auto"
        aria-label="Filtrer par catégorie"
      >
        {categories.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </Select>
      <Select
        value={sort}
        onChange={(e) => push({ sort: e.target.value })}
        className="h-10 w-auto"
        aria-label="Trier"
      >
        {sorts.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
