"use client";

import { useTransition } from "react";
import { deleteScheduledPost } from "@/lib/actions/social";
import { MonthCalendar, type CalendarEvent } from "@/components/month-calendar";

export function SocialCalendar({
  events,
  month,
}: {
  events: CalendarEvent[];
  month: string;
}) {
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
      <MonthCalendar events={events} month={month} onEventClick={handleEventClick} />
      {isPending && <p className="mt-2 text-xs text-zinc-500">Suppression...</p>}
    </div>
  );
}
