"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  color: string;
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Calendrier mensuel maison en CSS Grid : rendu côté serveur, aucune dépendance.
// `month` = "YYYY-MM". Navigation mois précédent/suivant via l'URL (searchParams)
// quand `navParam` + `basePath` sont fournis ; sinon les flèches sont masquées.
export function MonthCalendar({
  events,
  month,
  onDateClick,
  onEventClick,
  navParam,
  basePath,
}: {
  events: CalendarEvent[];
  month: string;
  onDateClick?: (dateStr: string) => void;
  onEventClick?: (eventId: string) => void;
  navParam?: string;
  basePath?: string;
}) {
  const [year, monthNum] = month.split("-").map(Number);
  const monthIndex = monthNum - 1;

  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay(); // 0=dim
  const leadingBlanks = (firstDow + 6) % 7; // grille commençant lundi

  const title = new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const prev = new Date(Date.UTC(year, monthIndex - 1, 1));
  const next = new Date(Date.UTC(year, monthIndex + 1, 1));
  const monthOf = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  const today = new Date();
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const list = eventsByDate.get(ev.date) ?? [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const navLink = (targetMonth: string, label: string, arrow: string) =>
    navParam && basePath ? (
      <Link
        href={`${basePath}?${navParam}=${targetMonth}`}
        className="rounded-md px-2 py-1 text-sm text-muted hover:bg-card dark:text-muted"
        aria-label={label}
      >
        {arrow}
      </Link>
    ) : null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        {navLink(monthOf(prev), "Mois précédent", "‹")}
        <span className="text-sm font-semibold capitalize text-ink">
          {title}
        </span>
        {navLink(monthOf(next), "Mois suivant", "›")}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-center text-[11px] font-medium text-muted">
            {d}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <div key={`b-${i}`} className="min-h-16" />;
          const dateStr = ymd(year, monthIndex, day);
          const dayEvents = eventsByDate.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;

          return (
            <div
              key={dateStr}
              className={cn(
                "min-h-16 rounded-sm border border-line p-1",
                onDateClick && "cursor-pointer hover:bg-card/50",
                isToday && "border-accent"
              )}
              onClick={onDateClick ? () => onDateClick(dateStr) : undefined}
              role={onDateClick ? "button" : undefined}
              tabIndex={onDateClick ? 0 : undefined}
              onKeyDown={
                onDateClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onDateClick(dateStr);
                      }
                    }
                  : undefined
              }
            >
              <div
                className={cn(
                  "mb-0.5 text-right text-[11px] tabular-nums",
                  isToday
                    ? "font-bold text-ink"
                    : "text-muted"
                )}
              >
                {day}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={
                      onEventClick
                        ? (e) => {
                            e.stopPropagation();
                            onEventClick(ev.id);
                          }
                        : undefined
                    }
                    title={ev.title}
                    className="block w-full truncate rounded-sm px-1 py-0.5 text-left text-[10px] font-medium text-white"
                    style={{ backgroundColor: ev.color }}
                  >
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="px-1 text-[10px] text-muted">
                    +{dayEvents.length - 3}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
