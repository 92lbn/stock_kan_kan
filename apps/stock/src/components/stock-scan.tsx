"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createStockItem, recordStockMovement } from "@/lib/actions/stock";
import { searchStockItems } from "@/lib/stock-search";
import type { ActionState } from "@stock-kan-kan/lib/action";
import { Sheet } from "@stock-kan-kan/ui/sheet";
import { Button } from "@stock-kan-kan/ui/button";
import { Input, Label, Select } from "@stock-kan-kan/ui/input";
import { ProductPhotoField } from "@/components/product-photo-field";

const BarcodeScanner = dynamic(
  () => import("@/components/barcode-scanner").then((module) => module.BarcodeScanner),
  { ssr: false, loading: () => <p className="py-8 text-center text-sm text-muted">Démarrage de la caméra…</p> },
);

const CATEGORIES = [
  { value: "EPICERIE", label: "Épicerie / Secs" },
  { value: "LEGUMES_FRAIS", label: "Légumes / Frais" },
  { value: "VIANDES_POISSONS", label: "Viandes / Poissons" },
  { value: "BOISSONS", label: "Boissons" },
  { value: "MENAGER_ENTRETIEN", label: "Ménager / Entretien" },
  { value: "CONSOMMABLES_EMBALLAGES", label: "Consommables / Emballages" },
];

const RECENT_ITEMS_KEY = "kan-kan-stock-recent-items";
const fr = (value: string) => Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
const imageSrc = (item: QuickStockItem) => `/api/stock-images/${item.id}?v=${item.imageVersion}`;

type Operation = "IN" | "OUT" | "ADJUSTMENT";
type Step = "choose" | "scan" | "search" | "found" | "unknown";

export type QuickStockItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: string;
  barcode: string;
  hasImage: boolean;
  imageVersion: string;
};

const OPERATION_LABELS: Record<Operation, { title: string; description: string; symbol: string }> = {
  IN: { title: "Entrée", description: "Ajouter une livraison", symbol: "+" },
  OUT: { title: "Sortie", description: "Retirer une quantité", symbol: "−" },
  ADJUSTMENT: { title: "Inventaire", description: "Compter le stock réel", symbol: "✓" },
};

export function StockScan({ items }: { items: QuickStockItem[] }) {
  const [open, setOpen] = useState(false);
  const [operation, setOperation] = useState<Operation>("IN");
  const [step, setStep] = useState<Step>("choose");
  const [code, setCode] = useState("");
  const [found, setFound] = useState<QuickStockItem | null>(null);
  const [suggestName, setSuggestName] = useState("");
  const [manual, setManual] = useState("");
  const [query, setQuery] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const recentItems = useMemo(
    () => recentIds.map((id) => items.find((item) => item.id === id)).filter(Boolean) as QuickStockItem[],
    [items, recentIds],
  );
  const searchResults = useMemo(() => {
    const source = query.trim() ? searchStockItems(items, query) : recentItems.length > 0 ? recentItems : items;
    return source.slice(0, 20);
  }, [items, query, recentItems]);

  function readRecentItems() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(RECENT_ITEMS_KEY) ?? "[]");
      setRecentIds(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string").slice(0, 8) : []);
    } catch {
      setRecentIds([]);
    }
  }

  function rememberItem(itemId: string) {
    const next = [itemId, ...recentIds.filter((id) => id !== itemId)].slice(0, 8);
    setRecentIds(next);
    window.localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(next));
  }

  function reset(nextStep: Step = "choose") {
    setStep(nextStep);
    setCode("");
    setFound(null);
    setSuggestName("");
    setManual("");
    setQuery("");
    setBusy(false);
  }

  function openOperation(nextOperation: Operation) {
    readRecentItems();
    setOperation(nextOperation);
    setStatus(null);
    reset();
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setStatus(null);
    reset();
  }

  function selectItem(item: QuickStockItem) {
    rememberItem(item.id);
    setFound(item);
    setCode(item.barcode);
    setStep("found");
  }

  async function resolve(scanned: string) {
    const cleanCode = scanned.trim();
    if (!cleanCode || busy) return;
    setBusy(true);
    setCode(cleanCode);
    const item = items.find((candidate) => candidate.barcode === cleanCode);
    if (item) {
      selectItem(item);
    } else {
      setStep("unknown");
      try {
        const response = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json?fields=product_name,brands`,
        );
        const result = await response.json();
        const name = [result?.product?.brands, result?.product?.product_name].filter(Boolean).join(" ");
        if (name) setSuggestName(name);
      } catch {
        /* réseau indisponible : le nom reste saisissable manuellement */
      }
    }
    setBusy(false);
  }

  function movementDone() {
    if (operation === "ADJUSTMENT") {
      setStatus("Inventaire enregistré. Tu peux passer au produit suivant.");
      reset();
    } else {
      close();
    }
  }

  const sheetTitle = step === "found" && found
    ? `${OPERATION_LABELS[operation].title} · ${found.name}`
    : step === "unknown"
      ? "Créer le produit"
      : OPERATION_LABELS[operation].title;

  return (
    <section
      aria-labelledby="stock-actions-title"
      className="rounded-xl border border-line bg-card p-3 shadow-sm lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-center lg:gap-4 lg:p-4"
    >
      <div className="mb-3 lg:mb-0">
        <h2 id="stock-actions-title" className="font-semibold text-ink">Que veux-tu faire ?</h2>
        <p className="text-sm text-muted">Une action, un produit, une quantité.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(Object.entries(OPERATION_LABELS) as [Operation, (typeof OPERATION_LABELS)[Operation]][]).map(
          ([value, details]) => (
            <button
              key={value}
              type="button"
              onClick={() => openOperation(value)}
              className="min-h-20 rounded-lg border border-line-strong bg-card-2 px-2 py-3 text-center text-ink transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:min-h-16 lg:py-2"
            >
              <span aria-hidden="true" className="mx-auto mb-1 grid h-8 w-8 place-items-center rounded-full bg-accent text-lg font-bold text-accent-ink">
                {details.symbol}
              </span>
              <span className="block text-sm font-semibold">{details.title}</span>
              <span className="hidden text-xs text-muted sm:block">{details.description}</span>
            </button>
          ),
        )}
      </div>

      <Sheet open={open} onClose={close} title={sheetTitle} size={step === "scan" ? "wide" : "default"}>
        <div className="pb-2">
          {status && <p role="status" className="mb-3 rounded-lg border border-line bg-card-2 px-3 py-2 text-sm text-ink">✓ {status}</p>}

          {step === "choose" && (
            <div className="space-y-3">
              <p className="text-sm text-muted">Comment veux-tu retrouver le produit ?</p>
              <button
                type="button"
                onClick={() => setStep("scan")}
                className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-line-strong bg-card px-4 py-3 text-left hover:bg-card-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span aria-hidden="true" className="text-2xl">▣</span>
                <span><strong className="block text-ink">Scanner un code-barres</strong><span className="text-sm text-muted">Pour les produits emballés</span></span>
              </button>
              <button
                type="button"
                onClick={() => setStep("search")}
                className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-line-strong bg-card px-4 py-3 text-left hover:bg-card-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span aria-hidden="true" className="text-2xl">⌕</span>
                <span><strong className="block text-ink">Produit sans code-barres</strong><span className="text-sm text-muted">Rechercher par nom ou catégorie</span></span>
              </button>
              {operation === "IN" && (
                <button
                  type="button"
                  onClick={() => { setCode(""); setSuggestName(""); setStep("unknown"); }}
                  className="min-h-11 w-full rounded-md px-3 py-2 text-sm font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Créer un nouvel article
                </button>
              )}
            </div>
          )}

          {step === "scan" && (
            <div className="space-y-3">
              <BarcodeScanner onDetected={resolve} />
              <div>
                <Label htmlFor="manual-barcode">Saisir le code EAN manuellement</Label>
                <div className="flex gap-2">
                  <Input
                    id="manual-barcode"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Ex. 3017620422003"
                    value={manual}
                    onChange={(event) => setManual(event.target.value.replace(/\D/g, ""))}
                    className="flex-1"
                  />
                  <Button type="button" variant="secondary" disabled={busy || !manual} onClick={() => void resolve(manual)}>
                    Rechercher
                  </Button>
                </div>
              </div>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("search")}>
                Rechercher plutôt par nom
              </Button>
            </div>
          )}

          {step === "search" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="stock-product-search">Nom, catégorie ou code</Label>
                <Input
                  id="stock-product-search"
                  type="search"
                  inputMode="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ex. tomates, boissons…"
                  autoFocus
                />
              </div>
              {!query && recentItems.length > 0 && <p className="text-xs font-medium uppercase tracking-wide text-muted">Produits récents</p>}
              {searchResults.length > 0 ? (
                <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                  {searchResults.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => selectItem(item)}
                        className="flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left hover:bg-card-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                      >
                        <span className="grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-md border border-line bg-card-2 text-muted">
                          {item.hasImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imageSrc(item)} alt="" loading="lazy" width="44" height="44" className="h-full w-full object-cover" />
                          ) : <span aria-hidden="true">◇</span>}
                        </span>
                        <span className="min-w-0 flex-1"><strong className="block truncate text-ink">{item.name}</strong><span className="text-sm text-muted">{fr(item.quantity)} {item.unit}</span></span>
                        <span aria-hidden="true" className="text-muted">›</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg border border-dashed border-line-strong p-4 text-center">
                  <p className="text-sm text-muted">Aucun produit trouvé.</p>
                  {operation === "IN" && <Button type="button" variant="ghost" className="mt-2" onClick={() => { setSuggestName(query); setCode(""); setStep("unknown"); }}>Créer ce produit</Button>}
                </div>
              )}
            </div>
          )}

          {step === "found" && found && (
            <MovementForm key={`${operation}-${found.id}`} item={found} operation={operation} onDone={movementDone} />
          )}

          {step === "unknown" && (
            <UnknownForm
              code={code}
              suggestName={suggestName}
              onDone={close}
              onBack={() => setStep(code ? "scan" : "search")}
            />
          )}
        </div>
      </Sheet>
    </section>
  );
}

function MovementForm({ item, operation, onDone }: { item: QuickStockItem; operation: Operation; onDone: () => void }) {
  const initialQuantity = operation === "ADJUSTMENT" ? item.quantity : "1";
  const [quantity, setQuantity] = useState(initialQuantity);
  const [state, action, pending] = useActionState(recordStockMovement.bind(null, item.id), undefined);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onDone();
    wasPending.current = pending;
  }, [pending, state, onDone]);

  function addQuantity(amount: number) {
    const current = Number(quantity.replace(",", ".")) || 0;
    setQuantity(String(current + amount));
  }

  const needsExpiry = operation === "IN" || (operation === "ADJUSTMENT" && Number(quantity.replace(",", ".")) > 0);
  const quantityLabel = operation === "ADJUSTMENT" ? `Quantité réellement présente (${item.unit})` : `Quantité (${item.unit})`;

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg bg-card-2 p-3">
        <span className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-lg border border-line bg-card text-muted">
          {item.hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageSrc(item)} alt="" width="48" height="48" className="h-full w-full object-cover" />
          ) : <span aria-hidden="true">◇</span>}
        </span>
        <span><strong className="block text-ink">{item.name}</strong><span className="text-sm text-muted">Actuellement : {fr(item.quantity)} {item.unit}</span></span>
      </div>
      <input type="hidden" name="type" value={operation} />
      <div>
        <Label htmlFor={`quick-quantity-${item.id}`}>{quantityLabel}</Label>
        <Input
          id={`quick-quantity-${item.id}`}
          name="quantity"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          required
          autoFocus
          className="h-14 text-xl"
        />
        <div className="mt-2 grid grid-cols-3 gap-2">
          {operation === "ADJUSTMENT" ? [0, 1, 5].map((value) => (
            <button key={value} type="button" onClick={() => setQuantity(String(value))} className="min-h-11 rounded-md border border-line-strong bg-card text-sm font-semibold text-ink hover:bg-card-2">{value} {item.unit}</button>
          )) : [1, 5, 10].map((value) => (
            <button key={value} type="button" onClick={() => addQuantity(value)} className="min-h-11 rounded-md border border-line-strong bg-card text-sm font-semibold text-ink hover:bg-card-2">+{value}</button>
          ))}
        </div>
      </div>
      {operation === "IN" && (
        <div><Label htmlFor={`quick-cost-${item.id}`}>Coût unitaire (€) — optionnel</Label><Input id={`quick-cost-${item.id}`} name="unitCost" type="number" inputMode="decimal" step="0.01" min="0" /></div>
      )}
      {needsExpiry && (
        <div className="grid grid-cols-2 gap-2">
          <div><Label htmlFor={`quick-expiry-${item.id}`}>DLC ou DDM (facultatif)</Label><Input id={`quick-expiry-${item.id}`} name="expiryDate" type="date" /></div>
          <div><Label htmlFor={`quick-lot-${item.id}`}>N° de lot</Label><Input id={`quick-lot-${item.id}`} name="lotNumber" /></div>
        </div>
      )}
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="min-h-12 w-full">
        {pending ? "Enregistrement…" : operation === "IN" ? "Ajouter au stock" : operation === "OUT" ? "Retirer du stock" : "Enregistrer et continuer"}
      </Button>
    </form>
  );
}

function UnknownForm({ code, suggestName, onDone, onBack }: { code: string; suggestName: string; onDone: () => void; onBack: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createStockItem, undefined);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onDone();
    wasPending.current = pending;
  }, [pending, state, onDone]);

  return (
    <form action={action} className="space-y-3">
      <p className="rounded-lg bg-card-2 px-4 py-3 text-sm text-muted">
        {code ? <>Le code <span className="num text-ink">{code}</span> est inconnu. Il sera reconnu au prochain scan.</> : "Ce produit n’a pas de code-barres. Tu pourras ensuite le retrouver par son nom ou sa photo."}
      </p>
      <input type="hidden" name="barcode" value={code} />
      <div><Label htmlFor="new-name">Nom</Label><Input id="new-name" name="name" defaultValue={suggestName} required autoFocus /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label htmlFor="new-category">Catégorie</Label><Select id="new-category" name="category" defaultValue="EPICERIE">{CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</Select></div>
        <div><Label htmlFor="new-unit">Unité</Label><Input id="new-unit" name="unit" placeholder="pièce, kg…" required /></div>
        <div><Label htmlFor="new-quantity">Quantité initiale</Label><Input id="new-quantity" name="quantity" type="number" step="any" min="0" defaultValue="0" required /></div>
        <div><Label htmlFor="new-threshold">Seuil d’alerte</Label><Input id="new-threshold" name="minThreshold" type="number" step="any" min="0" defaultValue="0" required /></div>
        <div><Label htmlFor="new-cost">Coût unitaire (€)</Label><Input id="new-cost" name="costPrice" type="number" step="0.01" min="0" defaultValue="0" /></div>
        <div><Label htmlFor="new-allergens">Allergènes</Label><Input id="new-allergens" name="allergens" placeholder="gluten…" /></div>
        <div><Label htmlFor="new-expiry">DLC du stock initial</Label><Input id="new-expiry" name="expiryDate" type="date" /></div>
        <div><Label htmlFor="new-lot">N° de lot</Label><Input id="new-lot" name="lotNumber" /></div>
      </div>
      <ProductPhotoField />
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>Retour</Button>
        <Button type="submit" disabled={pending} className="flex-1">{pending ? "Création…" : "Créer l’article"}</Button>
      </div>
    </form>
  );
}
