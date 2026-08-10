"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  findStockItemByBarcode,
  recordStockMovement,
  createStockItem,
  type ActionState,
} from "@/lib/actions/stock";
import { Sheet } from "@stock-kan-kan/ui/sheet";
import { Button } from "@stock-kan-kan/ui/button";
import { Input, Label, Select } from "@stock-kan-kan/ui/input";

// ZXing chargé uniquement à l'ouverture du scanner (chunk séparé).
const BarcodeScanner = dynamic(
  () => import("@/components/barcode-scanner").then((m) => m.BarcodeScanner),
  { ssr: false, loading: () => <p className="py-8 text-center text-sm text-muted">Démarrage de la caméra…</p> }
);

const CATEGORIES = [
  { value: "EPICERIE", label: "Épicerie / Secs" },
  { value: "LEGUMES_FRAIS", label: "Légumes / Frais" },
  { value: "VIANDES_POISSONS", label: "Viandes / Poissons" },
  { value: "BOISSONS", label: "Boissons" },
  { value: "MENAGER_ENTRETIEN", label: "Ménager / Entretien" },
  { value: "CONSOMMABLES_EMBALLAGES", label: "Consommables / Emballages" },
];

const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 });

type Found = { id: string; name: string; unit: string; quantity: number };

export function StockScan() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"scan" | "found" | "unknown">("scan");
  const [code, setCode] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [suggestName, setSuggestName] = useState("");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");

  function reset() {
    setStep("scan");
    setCode("");
    setFound(null);
    setSuggestName("");
    setBusy(false);
    setManual("");
  }
  function close() {
    setOpen(false);
    reset();
  }

  async function resolve(scanned: string) {
    const c = scanned.trim();
    if (!c || busy) return;
    setBusy(true);
    setCode(c);
    const item = await findStockItemByBarcode(c);
    if (item) {
      setFound(item);
      setStep("found");
    } else {
      setStep("unknown");
      // Nom auto via Open Food Facts (best-effort, produits alimentaires).
      try {
        const r = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(c)}.json?fields=product_name,brands`
        );
        const j = await r.json();
        const name = [j?.product?.brands, j?.product?.product_name].filter(Boolean).join(" ");
        if (name) setSuggestName(name);
      } catch {
        /* réseau indisponible : saisie manuelle du nom */
      }
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-card px-3 py-2 text-sm font-medium text-ink hover:bg-card-2"
      >
        <span aria-hidden>▣</span> Scanner
      </button>

      <Sheet
        open={open}
        onClose={close}
        title={step === "found" ? "Entrée en stock" : step === "unknown" ? "Produit inconnu" : "Scanner un code-barres"}
      >
        <div className="pb-2">
          {step === "scan" && (
            <div className="space-y-3">
              <BarcodeScanner onDetected={resolve} />
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-line" />
                <span className="text-xs text-muted">ou saisis le code</span>
                <div className="h-px flex-1 bg-line" />
              </div>
              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  placeholder="Code-barres"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="secondary" disabled={busy} onClick={() => resolve(manual)}>
                  OK
                </Button>
              </div>
            </div>
          )}

          {step === "found" && found && (
            <FoundForm found={found} code={code} onDone={close} />
          )}

          {step === "unknown" && (
            <UnknownForm
              code={code}
              suggestName={suggestName}
              categories={CATEGORIES}
              onDone={close}
              onBack={() => setStep("scan")}
            />
          )}
        </div>
      </Sheet>
    </>
  );

  // (composants internes ci-dessous)
}

function FoundForm({ found, code, onDone }: { found: Found; code: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(
    recordStockMovement.bind(null, found.id),
    undefined
  );
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !pending && !state?.error) onDone();
    was.current = pending;
  }, [pending, state, onDone]);

  return (
    <form action={action} className="space-y-3">
      <div className="rounded-lg bg-card-2 px-4 py-3">
        <p className="font-medium text-ink">{found.name}</p>
        <p className="text-xs text-muted">
          Code {code} · en stock <span className="num">{fr(found.quantity)}</span> {found.unit}
        </p>
      </div>
      <input type="hidden" name="type" value="IN" />
      <div>
        <Label htmlFor="scan-qty">Quantité reçue ({found.unit})</Label>
        <Input id="scan-qty" name="quantity" type="number" inputMode="decimal" step="any" min="0" required autoFocus className="h-12 text-base" />
      </div>
      <div>
        <Label htmlFor="scan-cost">Coût unitaire (€) — optionnel</Label>
        <Input id="scan-cost" name="unitCost" type="number" inputMode="decimal" step="0.01" min="0" />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="createExpense" className="h-4 w-4 accent-[var(--accent)]" />
        Enregistrer l&apos;achat en dépense &amp; recalculer le PMP
      </label>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "…" : "Ajouter au stock"}
      </Button>
    </form>
  );
}

function UnknownForm({
  code,
  suggestName,
  categories,
  onDone,
  onBack,
}: {
  code: string;
  suggestName: string;
  categories: { value: string; label: string }[];
  onDone: () => void;
  onBack: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createStockItem, undefined);
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !pending && !state?.error) onDone();
    was.current = pending;
  }, [pending, state, onDone]);

  return (
    <form action={action} className="space-y-3">
      <p className="rounded-lg bg-card-2 px-4 py-3 text-sm text-muted">
        Code <span className="num text-ink">{code}</span> introuvable. Crée l&apos;article — il
        sera reconnu au prochain scan.
      </p>
      <input type="hidden" name="barcode" value={code} />
      <div>
        <Label htmlFor="u-name">Nom</Label>
        <Input id="u-name" name="name" defaultValue={suggestName} required autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="u-cat">Catégorie</Label>
          <Select id="u-cat" name="category" defaultValue="EPICERIE">
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="u-unit">Unité</Label>
          <Input id="u-unit" name="unit" placeholder="pièce, kg…" required />
        </div>
        <div>
          <Label htmlFor="u-qty">Quantité</Label>
          <Input id="u-qty" name="quantity" type="number" step="any" min="0" defaultValue="0" required />
        </div>
        <div>
          <Label htmlFor="u-thr">Seuil</Label>
          <Input id="u-thr" name="minThreshold" type="number" step="any" min="0" defaultValue="0" required />
        </div>
        <div>
          <Label htmlFor="u-cost">Coût unit. (€)</Label>
          <Input id="u-cost" name="costPrice" type="number" step="0.01" min="0" defaultValue="0" />
        </div>
        <div>
          <Label htmlFor="u-alg">Allergènes</Label>
          <Input id="u-alg" name="allergens" placeholder="gluten…" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          ‹ Rescanner
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Création…" : "Créer l'article"}
        </Button>
      </div>
    </form>
  );
}
