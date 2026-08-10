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

// Convertit une saisie datetime-local (heure murale de Paris) en instant UTC.
// Refuse les heures inexistantes pendant le passage à l'heure d'été.
export function wallTimeParisToUtc(input: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input);
  if (!match) throw new Error("Date et heure invalides.");
  const [, y, mo, d, h, mi] = match;
  const wanted = { year: +y, month: +mo, day: +d, hour: +h, minute: +mi };
  if (wanted.hour > 23 || wanted.minute > 59) throw new Error("Date et heure invalides.");
  const wallAsUtc = Date.UTC(wanted.year, wanted.month - 1, wanted.day, wanted.hour, wanted.minute);
  let candidate = new Date(wallAsUtc);
  for (let i = 0; i < 3; i++) {
    const actual = partsInTZ(candidate, TZ);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    candidate = new Date(candidate.getTime() + wallAsUtc - actualAsUtc);
  }
  const check = partsInTZ(candidate, TZ);
  if (check.year !== wanted.year || check.month !== wanted.month || check.day !== wanted.day || check.hour !== wanted.hour || check.minute !== wanted.minute) {
    throw new Error("Cette heure n’existe pas en Europe/Paris à cause du changement d’heure.");
  }
  return candidate;
}

// "YYYY-MM-DD" d'une Date (à minuit UTC, colonnes @db.Date).
export function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 86400000);
}

// Lundi de la semaine contenant `date` (à minuit UTC), semaine commençant lundi.
export function weekStart(date: Date = new Date(), tz: string = TZ): Date {
  const { year, month, day } = partsInTZ(date, tz);
  const d = new Date(Date.UTC(year, month - 1, day));
  const offset = (d.getUTCDay() + 6) % 7; // jours écoulés depuis lundi
  return addDays(d, -offset);
}

// Lundi de la semaine d'un "YYYY-MM-DD" donné.
export function weekStartOfYmd(ymd: string): Date {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return addDays(d, -offset);
}

// Bornes [lundi, lundi+7) d'une semaine à partir d'un "YYYY-MM-DD".
export function weekRangeOf(ymd: string) {
  const start = weekStartOfYmd(ymd);
  return { start, end: addDays(start, 7) };
}

// Les 7 "YYYY-MM-DD" d'une semaine (lundi → dimanche).
export function weekDays(ymd: string): string[] {
  const start = weekStartOfYmd(ymd);
  return Array.from({ length: 7 }, (_, i) => toYmd(addDays(start, i)));
}

// "5 – 11 août" (ou "28 juil. – 3 août" à cheval sur deux mois).
export function formatWeekLabel(ymd: string): string {
  const start = weekStartOfYmd(ymd);
  const end = addDays(start, 6);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const fmt = (d: Date, withMonth: boolean) =>
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "UTC",
      day: "numeric",
      ...(withMonth ? { month: "short" } : {}),
    }).format(d);
  return `${fmt(start, !sameMonth)} – ${fmt(end, true)}`;
}

// "lun. 5" — jour de la semaine + numéro.
export function frenchWeekday(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
  }).format(d);
}

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
