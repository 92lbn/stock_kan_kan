"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  createStockItem,
  updateStockItem,
  deleteStockItem,
  recordStockMovement,
} from "@/lib/actions/stock";
import type { ActionState } from "@stock-kan-kan/lib/action";
import { Button } from "@stock-kan-kan/ui/button";
import { Input, Label, Select } from "@stock-kan-kan/ui/input";
import { Sheet } from "@stock-kan-kan/ui/sheet";
import { ConfirmAction } from "@stock-kan-kan/ui/confirm-action";
import { BarcodeField } from "@/components/barcode-field";
import { cn } from "@stock-kan-kan/lib/utils";
import { classifyExpiry, daysUntilExpiry, type ExpiryGroup } from "@stock-kan-kan/lib/expiry";
import { ProductPhotoField } from "@/components/product-photo-field";

export type StockItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: string;
  minThreshold: string;
  costPrice: string;
  allergens: string;
  barcode: string;
  hasImage: boolean;
  imageVersion: string;
  lots: { id: string; lotNumber: string; expiryDate: string; quantity: string }[];
};

const CATEGORIES = [
  { value: "EPICERIE", label: "Épicerie / Secs", short: "Épicerie" },
  { value: "LEGUMES_FRAIS", label: "Légumes / Frais", short: "Légumes" },
  { value: "VIANDES_POISSONS", label: "Viandes / Poissons", short: "Viandes" },
  { value: "BOISSONS", label: "Boissons", short: "Boissons" },
  { value: "MENAGER_ENTRETIEN", label: "Ménager / Entretien", short: "Ménager" },
  { value: "CONSOMMABLES_EMBALLAGES", label: "Consommables / Emballages", short: "Conso." },
];
const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.short ?? v;

const fr = (value: string) => Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
const imageSrc = (item: StockItem) => `/api/stock-images/${item.id}?v=${item.imageVersion}`;

type Status = "out" | "low" | "ok";
function statusOf(item: StockItem): Status {
  if (Number(item.quantity) <= 0) return "out";
  if (Number(item.minThreshold) > 0 && Number(item.quantity) <= Number(item.minThreshold)) return "low";
  return "ok";
}

export function StockView({ items, today }: { items: StockItem[]; today: string }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState("name");
  const [expiry, setExpiry] = useState<"" | ExpiryGroup>("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const presentCats = useMemo(
    () => CATEGORIES.filter((c) => items.some((i) => i.category === c.value)),
    [items]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = items.filter((i) =>
      (!cat || i.category === cat) &&
      (!needle || i.name.toLowerCase().includes(needle)) &&
      (!expiry || i.lots.some((lot) => classifyExpiry(lot.expiryDate, today) === expiry))
    );
    r = [...r].sort((a, b) => {
      if (sort === "low") {
        const rank = (x: StockItem) => (statusOf(x) === "out" ? 0 : statusOf(x) === "low" ? 1 : 2);
        return rank(a) - rank(b) || a.name.localeCompare(b.name, "fr");
      }
      if (sort === "qty") return Number(a.quantity) - Number(b.quantity);
      return a.name.localeCompare(b.name, "fr");
    });
    return r;
  }, [items, q, cat, sort, expiry, today]);

  const lowCount = useMemo(() => items.filter((i) => statusOf(i) !== "ok").length, [items]);
  // openItem est dérivé : si l'article est supprimé (revalidation), il devient null
  // et la fiche se referme d'elle-même — pas besoin d'effet.
  const openItem = items.find((i) => i.id === openId) ?? null;

  return (
    <div>
      {/* Recherche + tri (collant sous le titre) */}
      <div className="sticky top-0 z-10 -mx-4 bg-surface/95 px-4 pb-2 pt-1 backdrop-blur sm:top-14">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              ⌕
            </span>
            <Input
              type="search"
              inputMode="search"
              placeholder="Rechercher un article…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-11 pl-8"
              aria-label="Rechercher un article"
            />
          </div>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-11 w-auto"
            aria-label="Trier"
          >
            <option value="name">A → Z</option>
            <option value="qty">Quantité ↑</option>
            <option value="low">Alertes d&apos;abord</option>
          </Select>
        </div>

        {/* Pastilles de catégorie (défilement horizontal) */}
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip active={cat === ""} onClick={() => setCat("")}>
            Tout {lowCount > 0 && <span className="text-warning">· {lowCount} ⚠</span>}
          </Chip>
          {presentCats.map((c) => (
            <Chip key={c.value} active={cat === c.value} onClick={() => setCat(c.value)}>
              {c.short}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {([['', 'Toutes les DLC'], ['expired', 'Périmé'], ['urgent', 'À consommer vite'], ['soon', 'Sous 7 jours']] as const).map(([value, label]) => (
            <Chip key={value} active={expiry === value} onClick={() => setExpiry(value)}>{label}</Chip>
          ))}
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">Aucun article ne correspond.</p>
      ) : (
        <ul className="mt-2 overflow-hidden rounded-xl border border-line bg-card shadow-sm">
          {filtered.map((item) => (
            <StockLine key={item.id} item={item} onOpen={() => setOpenId(item.id)} />
          ))}
        </ul>
      )}

      {/* Bouton flottant « + » (au-dessus de la barre d'onglets mobile) */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="Ajouter un article"
        className="fixed bottom-24 right-4 z-20 grid h-14 w-14 place-items-center rounded-full bg-accent text-2xl text-accent-ink shadow-lg transition-transform active:scale-95 sm:bottom-8"
      >
        +
      </button>

      <Sheet open={!!openItem} onClose={() => setOpenId(null)} title={openItem?.name}>
        {openItem && <ItemActions item={openItem} today={today} onClose={() => setOpenId(null)} />}
      </Sheet>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Nouvel article">
        <AddForm onClose={() => setAddOpen(false)} />
      </Sheet>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-card text-muted hover:bg-card-2"
      )}
    >
      {children}
    </button>
  );
}

function StockLine({ item, onOpen }: { item: StockItem; onOpen: () => void }) {
  const status = statusOf(item);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left transition-colors hover:bg-card-2"
        style={{
          borderLeftColor:
            status === "out"
              ? "var(--danger)"
              : status === "low"
                ? "var(--warning)"
                : "transparent",
        }}
      >
        <div className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-lg border border-line bg-card-2 text-muted">
          {item.hasImage ? (
            // Miniature authentifiée, chargée uniquement lorsque la ligne devient visible.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageSrc(item)} alt="" loading="lazy" width="48" height="48" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden="true">◇</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{item.name}</p>
          <p className="text-xs text-muted">{catLabel(item.category)}</p>
        </div>
        <div className="text-right">
          <p className="num font-semibold text-ink">
            {fr(item.quantity)} <span className="text-xs font-normal text-muted">{item.unit}</span>
          </p>
          {status === "out" ? (
            <span className="text-[11px] font-semibold text-danger">Rupture</span>
          ) : status === "low" ? (
            <span className="text-[11px] font-semibold text-warning">Bas · seuil {fr(item.minThreshold)}</span>
          ) : null}
        </div>
        <span className="text-faint" aria-hidden>
          ›
        </span>
      </button>
    </li>
  );
}

const MOVEMENTS = [
  { value: "IN", label: "Entrée" },
  { value: "OUT", label: "Sortie" },
  { value: "ADJUSTMENT", label: "Correction" },
];

function ItemActions({ item, today, onClose }: { item: StockItem; today: string; onClose: () => void }) {
  const [type, setType] = useState("IN");
  const [editing, setEditing] = useState(false);

  const boundMove = recordStockMovement.bind(null, item.id);
  const [moveState, moveAction, movePending] = useActionState(boundMove, undefined);
  const wasMoving = useRef(false);
  useEffect(() => {
    if (wasMoving.current && !movePending && !moveState?.error) onClose();
    wasMoving.current = movePending;
  }, [movePending, moveState, onClose]);

  const boundEdit = updateStockItem.bind(null, item.id);
  const [editState, editAction, editPending] = useActionState(boundEdit, undefined);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editPending && !editState?.error) setEditing(false);
    wasEditing.current = editPending;
  }, [editPending, editState]);

  return (
    <div className="space-y-4 pb-2">
      {item.hasImage && (
        <div className="overflow-hidden rounded-xl border border-line bg-card-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc(item)} alt={`Photo de ${item.name}`} className="max-h-56 w-full object-contain" />
        </div>
      )}
      {/* Quantité courante */}
      <div className="flex items-end justify-between rounded-lg bg-card-2 px-4 py-3">
        <span className="kpi-label">En stock</span>
        <span className="num text-3xl font-bold text-ink">
          {fr(item.quantity)} <span className="text-base font-normal text-muted">{item.unit}</span>
        </span>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">Lots par DLC</h3>
        {item.lots.length === 0 ? <p className="text-sm text-muted">Aucun lot disponible.</p> : (
          <ul className="divide-y divide-line rounded-md border border-line">
            {item.lots.map((lot) => {
              const days = daysUntilExpiry(lot.expiryDate, today);
              const group = classifyExpiry(lot.expiryDate, today);
              const label = group === "expired" ? "Périmé" : group === "urgent" ? "À consommer vite" : group === "soon" ? "Sous 7 jours" : "DLC OK";
              return <li key={lot.id} className="flex min-h-11 items-center justify-between px-3 text-sm">
                <span><span className="num">{lot.expiryDate}</span>{lot.lotNumber ? ` · ${lot.lotNumber}` : ""}<span className="block text-xs text-muted">{label}</span></span>
                <span className={cn("num font-medium", days < 0 ? "text-danger" : days <= 3 ? "text-warning" : "text-ink")}>{fr(lot.quantity)} {item.unit}</span>
              </li>;
            })}
          </ul>
        )}
      </div>

      {/* Mouvement rapide */}
      <form action={moveAction} className="space-y-2">
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-line p-1">
          {MOVEMENTS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setType(m.value)}
              className={cn(
                "rounded-md py-2 text-sm font-medium",
                type === m.value ? "bg-accent text-accent-ink" : "text-muted"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={type} />
        <div className="flex gap-2">
          <Input
            name="quantity"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder={type === "ADJUSTMENT" ? `Nouvelle quantité (${item.unit})` : `Quantité (${item.unit})`}
            required
            className="h-12 flex-1 text-base"
          />
          {type === "IN" && (
            <Input
              name="unitCost"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="Coût €"
              className="h-12 w-24 text-base"
            />
          )}
        </div>
        {type !== "OUT" && <div className="grid grid-cols-2 gap-2">
          <div><Label htmlFor={`expiry-${item.id}`}>DLC</Label><Input id={`expiry-${item.id}`} name="expiryDate" type="date" required /></div>
          <div><Label htmlFor={`lot-${item.id}`}>N° de lot</Label><Input id={`lot-${item.id}`} name="lotNumber" /></div>
        </div>}
        {moveState?.error && <p className="text-sm text-danger">{moveState.error}</p>}
        <Button type="submit" disabled={movePending} className="w-full">
          {movePending ? "…" : "Valider le mouvement"}
        </Button>
      </form>

      {/* Édition de la fiche */}
      {editing ? (
        <form action={editAction} className="space-y-3 rounded-lg bg-card-2 p-3">
          <div>
            <Label htmlFor={`e-name-${item.id}`}>Nom</Label>
            <Input id={`e-name-${item.id}`} name="name" defaultValue={item.name} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor={`e-cat-${item.id}`}>Catégorie</Label>
              <Select id={`e-cat-${item.id}`} name="category" defaultValue={item.category}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor={`e-unit-${item.id}`}>Unité</Label>
              <Input id={`e-unit-${item.id}`} name="unit" defaultValue={item.unit} required />
            </div>
            <div>
              <Label htmlFor={`e-thr-${item.id}`}>Seuil</Label>
              <Input id={`e-thr-${item.id}`} name="minThreshold" type="number" step="any" min="0" defaultValue={item.minThreshold} required />
            </div>
            <div>
              <Label htmlFor={`e-alg-${item.id}`}>Allergènes</Label>
              <Input id={`e-alg-${item.id}`} name="allergens" defaultValue={item.allergens} placeholder="gluten…" />
            </div>
            <div className="col-span-2">
              <Label htmlFor={`e-bc-${item.id}`}>Code-barres</Label>
              <BarcodeField id={`e-bc-${item.id}`} name="barcode" defaultValue={item.barcode} />
            </div>
          </div>
          <ProductPhotoField existingSrc={item.hasImage ? imageSrc(item) : undefined} />
          {editState?.error && <p className="text-sm text-danger">{editState.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={editPending}>
              {editPending ? "…" : "Enregistrer"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between border-t border-line pt-3">
          <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Modifier la fiche
          </Button>
          <ConfirmAction
            action={deleteStockItem.bind(null, item.id)}
            message={`« ${item.name} » sera masqué (suppression réversible).`}
          />
        </div>
      )}
    </div>
  );
}

function AddForm({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createStockItem,
    undefined
  );
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onClose();
    wasPending.current = pending;
  }, [pending, state, onClose]);

  return (
    <form action={action} className="space-y-3 pb-2">
      <div>
        <Label htmlFor="a-name">Nom de l&apos;article</Label>
        <Input id="a-name" name="name" required autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="a-cat">Catégorie</Label>
          <Select id="a-cat" name="category" required defaultValue="EPICERIE">
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="a-unit">Unité</Label>
          <Input id="a-unit" name="unit" placeholder="kg, carton…" required />
        </div>
        <div>
          <Label htmlFor="a-qty">Quantité</Label>
          <Input id="a-qty" name="quantity" type="number" step="any" min="0" defaultValue="0" required />
        </div>
        <div>
          <Label htmlFor="a-thr">Seuil d&apos;alerte</Label>
          <Input id="a-thr" name="minThreshold" type="number" step="any" min="0" defaultValue="0" required />
        </div>
        <div>
          <Label htmlFor="a-cost">Coût unit. (€)</Label>
          <Input id="a-cost" name="costPrice" type="number" step="0.01" min="0" defaultValue="0" />
        </div>
        <div>
          <Label htmlFor="a-expiry">DLC du stock initial</Label>
          <Input id="a-expiry" name="expiryDate" type="date" />
        </div>
        <div>
          <Label htmlFor="a-lot">N° de lot</Label>
          <Input id="a-lot" name="lotNumber" />
        </div>
        <div>
          <Label htmlFor="a-alg">Allergènes</Label>
          <Input id="a-alg" name="allergens" placeholder="gluten, lait…" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="a-bc">Code-barres (optionnel)</Label>
          <BarcodeField id="a-bc" name="barcode" />
        </div>
      </div>
      <ProductPhotoField />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Ajout…" : "Ajouter l'article"}
      </Button>
    </form>
  );
}
