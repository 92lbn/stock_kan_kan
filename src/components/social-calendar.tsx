"use client";

import dynamic from "next/dynamic";
import { useTransition } from "react";
import { deleteScheduledPost } from "@/lib/actions/social";
import type { CalendarEvent } from "@/components/planning-calendar";

const PlanningCalendar = dynamic(
  () => import("@/components/planning-calendar").then((mod) => mod.PlanningCalendar),
  { ssr: false, loading: () => <p className="text-sm text-zinc-500">Chargement du calendrier...</p> }
);

export function SocialCalendar({ events }: { events: CalendarEvent[] }) {
  const [isPending, startTransition] = useTransition();

  function handleEventClick(postId: string) {
    if (!confirm("Supprimer ce post planifié ?")) return;
    startTransition(async () => {
      await deleteScheduledPost(postId);
    });
  }

  return (
    <div>
      <p className="mb-3 text-xs text-zinc-500">Clique sur un post pour le supprimer.</p>
      <PlanningCalendar events={events} onEventClick={handleEventClick} />
      {isPending && <p className="mt-2 text-xs text-zinc-500">Suppression...</p>}
    </div>
  );
}
