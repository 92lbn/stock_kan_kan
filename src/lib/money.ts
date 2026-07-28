import { Prisma } from "@/generated/prisma/client";

// Source unique pour tout calcul et formatage monétaire / de quantité.
// Aucun montant en euros ne doit être manipulé en Number brut ailleurs dans le code :
// les Float perdent des centimes (0.1 + 0.2 !== 0.3). On passe toujours par Decimal.

export type DecimalInput = Prisma.Decimal | number | string;

const D = Prisma.Decimal;

export function toDecimal(value: DecimalInput): Prisma.Decimal {
  return new D(value);
}

/** Additionne une liste de montants sans perte de précision. */
export function addMoney(...values: DecimalInput[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((sum, v) => sum.plus(new D(v)), new D(0));
}

/** Soustrait b de a. */
export function subtractMoney(a: DecimalInput, b: DecimalInput): Prisma.Decimal {
  return new D(a).minus(new D(b));
}

/** Multiplie deux valeurs (ex. quantité × prix unitaire). */
export function multiplyMoney(a: DecimalInput, b: DecimalInput): Prisma.Decimal {
  return new D(a).times(new D(b));
}

const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

/** Formate un montant en euros, format français : "1 234,50 €". */
export function formatEUR(value: DecimalInput): string {
  return eurFormatter.format(new D(value).toNumber());
}

const quantityFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 3,
});

/** Formate une quantité de stock (jusqu'à 3 décimales), format français. */
export function formatQuantity(value: DecimalInput): string {
  return quantityFormatter.format(new D(value).toNumber());
}
