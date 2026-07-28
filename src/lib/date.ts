// Source unique de vérité pour les dates. Toute l'app raisonne en Europe/Paris.
//
// Deux natures de colonnes dans le schéma :
//  - date-only (@db.Date) : shift.date, ledger.date → stockées à minuit UTC du jour civil.
//    parseDateInput / toDateOnly produisent ce minuit UTC ; monthRange/dayRange renvoient
//    des bornes à minuit UTC du mois/jour civil (parisien). C'est l'usage principal.
//  - timestamp (DateTime) : createdAt, remindAt, timeEntries.timestamp → instants réels.
//
// On évite ainsi le décalage d'un jour selon l'heure serveur et la saison (heure d'été/hiver).

export const TZ = "Europe/Paris";

const pad = (n: number) => String(n).padStart(2, "0");

// Décompose un instant en composants de date/heure du fuseau donné.
export function partsInTZ(date: Date, tz: string = TZ) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month), // 1-12
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

// "YYYY-MM" du mois civil (parisien) contenant `date`.
export function toYearMonth(date: Date = new Date(), tz: string = TZ): string {
  const { year, month } = partsInTZ(date, tz);
  return `${year}-${pad(month)}`;
}

// Bornes [start, end) du mois civil contenant `date`, à minuit UTC (colonnes @db.Date).
export function monthRange(date: Date = new Date(), tz: string = TZ) {
  const { year, month } = partsInTZ(date, tz);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

// Bornes d'un mois donné, "YYYY-MM" → { start, end } à minuit UTC.
export function monthRangeOf(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

// Bornes [start, end) du jour civil contenant `date`, à minuit UTC.
export function dayRange(date: Date = new Date(), tz: string = TZ) {
  const { year, month, day } = partsInTZ(date, tz);
  return {
    start: new Date(Date.UTC(year, month - 1, day)),
    end: new Date(Date.UTC(year, month - 1, day + 1)),
  };
}

// "YYYY-MM-DD" (ou Date) → Date à minuit UTC, pour stocker une colonne @db.Date.
export function toDateOnly(input: string | Date, tz: string = TZ): Date {
  if (typeof input === "string") {
    return new Date(`${input}T00:00:00.000Z`);
  }
  const { year, month, day } = partsInTZ(input, tz);
  return new Date(Date.UTC(year, month - 1, day));
}

export const parseDateInput = toDateOnly;

// Nombre de jours dans le mois civil (parisien) de `date`.
export function daysInMonth(date: Date = new Date(), tz: string = TZ): number {
  const { year, month } = partsInTZ(date, tz);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Formatage FR. Les colonnes @db.Date étant à minuit UTC, on les formate en UTC pour
// garder le même jour civil ; les instants réels se formatent en Europe/Paris.
export function formatDateFR(date: Date, tz: string = "UTC"): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatTimeFR(date: Date, tz: string = TZ): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatMonthFR(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}
