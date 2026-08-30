"use client";

import { useMemo, useState, useTransition } from "react";
import { ensureInternalBarcodes } from "@/lib/actions/stock";
import { Code128Barcode } from "@/components/code128-barcode";
import { Button } from "@stock-kan-kan/ui/button";
import { Input, Select } from "@stock-kan-kan/ui/input";

export type LabelItem = { id: string; name: string; category: string; barcode: string };

const CATEGORIES = [
  { value: "EPICERIE", label: "Épicerie / Secs" },
  { value: "LEGUMES_FRAIS", label: "Légumes / Frais" },
  { value: "VIANDES_POISSONS", label: "Viandes / Poissons" },
  { value: "BOISSONS", label: "Boissons" },
  { value: "MENAGER_ENTRETIEN", label: "Ménager / Entretien" },
  { value: "CONSOMMABLES_EMBALLAGES", label: "Consommables / Emballages" },
];
const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;

export function LabelsView({ items: initialItems }: { items: LabelItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialItems.map((item) => item.id)));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (!cat || item.category === cat) &&
          (!q.trim() || item.name.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [items, q, cat],
  );

  const selectedItems = items.filter((item) => selected.has(item.id));
  const missing = selectedItems.filter((item) => !item.barcode);
  const printable = selectedItems.filter((item) => item.barcode);

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

  function prepareMissing() {
    if (missing.length === 0) return;
    setError("");
    const ids = missing.map((item) => item.id);
    startTransition(async () => {
      const result = await ensureInternalBarcodes(ids);
      if (result.error) {
        setError(result.error);
        return;
      }
      setItems((prev) =>
        prev.map((item) => (result.barcodes?.[item.id] ? { ...item, barcode: result.barcodes[item.id] } : item)),
      );
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3 print:hidden">
        <p className="text-sm text-muted">
          Sélectionne les produits à étiqueter, prépare les codes-barres manquants puis imprime la sélection sur
          l’imprimante d’étiquettes (format 80 × 40 mm).
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
                    {item.barcode ? "" : " · sans code-barres"}
                  </span>
                </span>
              </label>
            </li>
          ))}
          {filtered.length === 0 && <li className="p-3 text-sm text-muted">Aucun produit.</li>}
        </ul>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {missing.length > 0 && (
            <Button type="button" variant="secondary" disabled={pending} onClick={prepareMissing} className="min-h-11">
              {pending ? "Préparation…" : `Préparer ${missing.length} étiquette(s) manquante(s)`}
            </Button>
          )}
          <Button type="button" disabled={printable.length === 0} onClick={() => window.print()} className="min-h-11">
            Imprimer {printable.length} étiquette(s)
          </Button>
        </div>
      </div>

      <div aria-hidden className="hidden print:block">
        {printable.map((item) => (
          <div key={item.id} className="label-print-card w-[80mm] bg-white p-4 text-center text-black">
            <p className="truncate text-base font-bold">kan·kan · {item.name}</p>
            <Code128Barcode value={item.barcode} />
            <p className="mt-1 font-mono text-xs tracking-wider">{item.barcode}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
