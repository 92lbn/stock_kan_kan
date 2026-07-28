"use client";

import { MonthCalendar, type CalendarEvent } from "@/components/month-calendar";

export function EmployeePlanningCalendar({
  events,
  month,
}: {
  events: CalendarEvent[];
  month: string;
}) {
  return <MonthCalendar events={events} month={month} />;
}
