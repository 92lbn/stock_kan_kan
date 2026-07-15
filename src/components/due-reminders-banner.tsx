import Link from "next/link";

type ReminderNote = {
  id: string;
  content: string;
  remindAt: Date | null;
};

export function DueRemindersBanner({ notes }: { notes: ReminderNote[] }) {
  if (notes.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-amber-900 dark:text-amber-200">
          🔔 Rappels ({notes.length})
        </p>
        <Link href="/notes" className="text-sm font-medium text-amber-900 underline dark:text-amber-200">
          Voir mes notes
        </Link>
      </div>
      <ul className="space-y-1">
        {notes.map((note) => (
          <li key={note.id} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-amber-900 dark:text-amber-100">{note.content}</span>
            {note.remindAt && (
              <span className="whitespace-nowrap text-xs text-amber-700 dark:text-amber-300">
                {note.remindAt.toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
