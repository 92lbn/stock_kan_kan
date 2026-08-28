"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  createStockItem,
  updateStockItem,
  recordStockMovement,
} from "@/lib/actions/stock";
import type { ActionState } from "@stock-kan-kan/lib/action";
import { Button } from "@stock-kan-kan/ui/button";
import { Input, Label, Select } from "@stock-kan-kan/ui/input";
import { Sheet, type SheetAnchor } from "@stock-kan-kan/ui/sheet";
import { BarcodeField } from "@/components/barcode-field";
import { cn } from "@stock-kan-kan/lib/utils";
import { classifyExpiry, daysUntilExpiry, type ExpiryGroup } from "@stock-kan-kan/lib/expiry";
import { ProductPhotoField } from "@/components/product-photo-field";
import { InternalBarcodeLabel } from "@/components/internal-barcode-label";

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
  const [openInEditMode, setOpenInEditMode] = useState(false);
  const [movementAnchor, setMovementAnchor] = useState<SheetAnchor>();
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
      (!expiry || i.lots.some((lot) => lot.expiryDate && classifyExpiry(lot.expiryDate, today) === expiry))
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
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <StockCard
              key={item.id}
              item={item}
              today={today}
              onOpen={(anchor) => {
                setOpenInEditMode(false);
                setMovementAnchor(anchor);
                setOpenId(item.id);
              }}
              onEdit={() => {
                setOpenInEditMode(true);
                setMovementAnchor(undefined);
                setOpenId(item.id);
              }}
            />
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

      <Sheet
        open={!!openItem}
        onClose={() => setOpenId(null)}
        title={openItem?.name}
        size="compact"
        anchor={openInEditMode ? undefined : movementAnchor}
      >
        {openItem && (
          <ItemActions
            item={openItem}
            initiallyEditing={openInEditMode}
            onClose={() => setOpenId(null)}
          />
        )}
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
      aria-pressed={active}
      className={cn(
        "min-h-11 whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-card text-muted hover:bg-card-2"
      )}
    >
      {children}
    </button>
  );
}

function StockCard({
  item,
  today,
  onOpen,
  onEdit,
}: {
  item: StockItem;
  today: string;
  onOpen: (anchor: SheetAnchor) => void;
  onEdit: () => void;
}) {
  const status = statusOf(item);
  const closestLot = [...item.lots]
    .filter((lot) => Number(lot.quantity) > 0 && lot.expiryDate)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0];
  const closestDays = closestLot ? daysUntilExpiry(closestLot.expiryDate, today) : null;

  return (
    <li className="group relative overflow-hidden rounded-xl border border-line bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-primary">
      <button
        type="button"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const bubbleWidth = Math.min(352, viewportWidth - 32);
          const keyboardClick = event.detail === 0;
          const clickX = keyboardClick ? rect.left + rect.width / 2 : event.clientX;
          const clickY = keyboardClick ? rect.top + rect.height / 2 : event.clientY;
          const left = Math.min(
            Math.max(clickX - bubbleWidth / 2, 16),
            viewportWidth - bubbleWidth - 16
          );
          const gap = 12;
          const preferredHeight = Math.min(360, viewportHeight - 32);
          const roomBelow = viewportHeight - clickY - gap;
          const roomAbove = clickY - gap;

          if (roomBelow >= preferredHeight) {
            onOpen({ left, top: clickY + gap });
          } else if (roomAbove >= preferredHeight) {
            onOpen({ left, bottom: viewportHeight - clickY + gap });
          } else {
            onOpen({ left, top: 16 });
          }
        }}
        className="block w-full text-left focus-visible:outline-none"
        aria-label={`${item.name}, ${fr(item.quantity)} ${item.unit}. Ajouter ou retirer du stock`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-card-2 text-muted">
          {item.hasImage ? (
            // Miniature authentifiée, chargée uniquement lorsque la carte devient visible.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc(item)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="grid h-full place-items-center bg-card-2">
              <span className="text-4xl" aria-hidden="true">◇</span>
              <span className="sr-only">Aucune photo</span>
            </div>
          )}
          <span
            className={cn(
              "absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-semibold shadow-sm",
              status === "out"
                ? "bg-danger text-white"
                : status === "low"
                  ? "bg-warning text-black"
                  : "bg-card/95 text-ink"
            )}
          >
            {status === "out" ? "Rupture" : status === "low" ? "Stock bas" : "En stock"}
          </span>
        </div>
        <div className="min-h-28 p-3 pr-14">
          <p className="line-clamp-2 text-base font-semibold leading-tight text-ink">{item.name}</p>
          <p className="mt-1 text-xs text-muted">{catLabel(item.category)}</p>
          <p className="num mt-2 text-lg font-bold text-ink">
            {fr(item.quantity)} <span className="text-sm font-normal text-muted">{item.unit}</span>
          </p>
          {closestLot && closestDays !== null && closestDays <= 7 && (
            <p className={cn("mt-1 text-xs font-semibold", closestDays < 0 ? "text-danger" : "text-warning") }>
              {closestDays < 0
                ? `DLC dépassée · ${closestLot.expiryDate}`
                : closestDays === 0
                  ? "DLC aujourd’hui"
                  : `DLC dans ${closestDays} jour${closestDays > 1 ? "s" : ""}`}
            </p>
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full border border-line bg-card text-lg text-muted shadow-sm hover:bg-card-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Modifier la fiche de ${item.name}`}
        title="Modifier la fiche"
      >
        <span aria-hidden="true">✎</span>
      </button>
    </li>
  );
}

const MOVEMENTS = [
  { value: "OUT", label: "− Sortie" },
  { value: "IN", label: "+ Entrée" },
] as const;

function ItemActions({
  item,
  initiallyEditing,
  onClose,
}: {
  item: StockItem;
  initiallyEditing: boolean;
  onClose: () => void;
}) {
  const [type, setType] = useState("IN");
  const [editing, setEditing] = useState(initiallyEditing);
  const [showExpiry, setShowExpiry] = useState(false);

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

  if (editing) {
    return (
      <div className="space-y-3 pb-2">
        <form action={editAction} className="space-y-3">
          <div>
            <Label htmlFor={`e-name-${item.id}`}>Nom</Label>
            <Input id={`e-name-${item.id}`} name="name" defaultValue={item.name} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor={`e-cat-${item.id}`}>Catégorie</Label>
              <Select id={`e-cat-${item.id}`} name="category" defaultValue={item.category}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
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
            <Button type="submit" size="sm" disabled={editPending} className="min-h-11 flex-1">
              {editPending ? "…" : "Enregistrer"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} className="min-h-11">
              Annuler
            </Button>
          </div>
        </form>
        {(!item.barcode || item.barcode.startsWith("KAN-")) && (
          <InternalBarcodeLabel itemId={item.id} itemName={item.name} barcode={item.barcode} />
        )}
      </div>
    );
  }

  return (
    <form action={moveAction} className="space-y-3 pb-1">
        <p className="text-sm text-muted">
          Stock : <span className="num font-semibold text-ink">{fr(item.quantity)} {item.unit}</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {MOVEMENTS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setType(m.value)}
              aria-pressed={type === m.value}
              className={cn(
                "min-h-12 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                type === m.value ? "bg-accent text-accent-ink" : "text-muted"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={type} />
        <div>
          <Label htmlFor={`quantity-${item.id}`}>Quantité ({item.unit})</Label>
          <Input
            id={`quantity-${item.id}`}
            name="quantity"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0"
            required
            autoFocus
            className="h-12 text-lg"
          />
        </div>
        {type === "IN" && (
          <div>
            <button
              type="button"
              onClick={() => setShowExpiry((value) => !value)}
              aria-expanded={showExpiry}
              className="min-h-11 w-full rounded-lg border border-line bg-card-2 px-3 text-left text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {showExpiry ? "− Retirer la date" : "+ Ajouter une date (facultatif)"}
            </button>
            {showExpiry && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`expiry-${item.id}`}>DLC ou DDM</Label>
                  <Input id={`expiry-${item.id}`} name="expiryDate" type="date" />
                </div>
                <div>
                  <Label htmlFor={`lot-${item.id}`}>N° de lot</Label>
                  <Input id={`lot-${item.id}`} name="lotNumber" />
                </div>
              </div>
            )}
          </div>
        )}
        {moveState?.error && <p className="text-sm text-danger">{moveState.error}</p>}
        <Button type="submit" disabled={movePending} className="w-full">
          {movePending ? "Enregistrement…" : type === "IN" ? "Ajouter" : "Retirer"}
        </Button>
    </form>
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
