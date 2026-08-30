"use client";

import { useMemo, useState } from "react";
import { Input, Select } from "@stock-kan-kan/ui/input";
import { Button } from "@stock-kan-kan/ui/button";

export type LabelItem = { id: string; name: string; category: string; hasImage: boolean; imageVersion: string };

const CATEGORIES = [
  { value: "EPICERIE", label: "Épicerie / Secs" },
  { value: "LEGUMES_FRAIS", label: "Légumes / Frais" },
  { value: "VIANDES_POISSONS", label: "Viandes / Poissons" },
  { value: "BOISSONS", label: "Boissons" },
  { value: "MENAGER_ENTRETIEN", label: "Ménager / Entretien" },
  { value: "CONSOMMABLES_EMBALLAGES", label: "Consommables / Emballages" },
];
const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
const imageSrc = (item: LabelItem) => `/api/stock-images/${item.id}?v=${item.imageVersion}`;

export function LabelsView({ items }: { items: LabelItem[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(items.map((item) => item.id)));

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (!cat || item.category === cat) &&
          (!q.trim() || item.name.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [items, q, cat],
  );

  const printable = items.filter((item) => selected.has(item.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleFiltered(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of filtered) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3 print:hidden">
        <p className="text-sm text-muted">
          Sélectionne les produits à étiqueter puis imprime : chaque étiquette affiche la photo et le nom du
          produit (format 80 × 40 mm, une étiquette par page).
        </p>

        <div className="flex flex-wrap gap-2">
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Rechercher un produit…"
            aria-label="Rechercher un produit"
            className="min-w-[200px] flex-1"
          />
          <Select value={cat} onChange={(event) => setCat(event.target.value)} aria-label="Filtrer par catégorie" className="min-w-[170px]">
            <option value="">Toutes catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button type="button" className="min-h-11 font-medium text-accent" onClick={() => toggleFiltered(true)}>
            Tout sélectionner
          </button>
          <button type="button" className="min-h-11 font-medium text-accent" onClick={() => toggleFiltered(false)}>
            Tout désélectionner
          </button>
          <span className="text-muted">
            <span className="num">{selected.size}</span> sélectionné(s)
          </span>
        </div>

        <ul className="divide-y divide-line rounded-lg border border-line">
          {filtered.map((item) => (
            <li key={item.id}>
              <label className="flex min-h-11 items-center gap-3 p-3">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-accent"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
                  <span className="block text-xs text-muted">
                    {catLabel(item.category)}
                    {item.hasImage ? "" : " · sans photo"}
                  </span>
                </span>
              </label>
            </li>
          ))}
          {filtered.length === 0 && <li className="p-3 text-sm text-muted">Aucun produit.</li>}
        </ul>

        <Button type="button" disabled={printable.length === 0} onClick={() => window.print()} className="min-h-11">
          Imprimer {printable.length} étiquette(s)
        </Button>
      </div>

      <div aria-hidden className="hidden print:block">
        {printable.map((item) => (
          <div key={item.id} className="label-print-card flex w-[80mm] flex-col items-center gap-2 bg-white p-3 text-center text-black">
            {item.hasImage ? (
              // Miniature authentifiée, spécifique à l'impression — pas d'équivalent statique optimisable.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc(item)} alt="" className="h-[24mm] w-[24mm] rounded object-cover" />
            ) : (
              <div className="grid h-[24mm] w-[24mm] place-items-center rounded border border-black/20 text-2xl" aria-hidden="true">
                ◇
              </div>
            )}
            <p className="text-base font-bold leading-tight">{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
