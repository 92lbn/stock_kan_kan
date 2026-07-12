"use client";

import dynamic from "next/dynamic";
import type { CalendarEvent } from "@/components/planning-calendar";

const PlanningCalendar = dynamic(
  () => import("@/components/planning-calendar").then((mod) => mod.PlanningCalendar),
  { ssr: false, loading: () => <p className="text-sm text-zinc-500">Chargement du calendrier...</p> }
);

export function EmployeePlanningCalendar({ events }: { events: CalendarEvent[] }) {
  return <PlanningCalendar events={events} />;
}
