"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";

export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  color: string;
};

export function PlanningCalendar({
  events,
  onDateClick,
  onEventClick,
}: {
  events: CalendarEvent[];
  onDateClick?: (dateStr: string) => void;
  onEventClick?: (eventId: string) => void;
}) {
  return (
    <div className="fc-restaurant">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locales={[frLocale]}
        locale="fr"
        height="auto"
        dayMaxEvents={3}
        events={events}
        dateClick={onDateClick ? (info) => onDateClick(info.dateStr) : undefined}
        eventClick={onEventClick ? (info) => onEventClick(info.event.id) : undefined}
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
      />
    </div>
  );
}
