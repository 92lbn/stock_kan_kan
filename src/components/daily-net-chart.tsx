import { cn } from "@/lib/utils";

export function DailyNetChart({ data }: { data: { day: number; net: number }[] }) {
  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.net)));

  return (
    <div className="flex h-32 items-end gap-0.5">
      {data.map((d) => {
        const heightPct = Math.max(4, (Math.abs(d.net) / maxAbs) * 100);
        return (
          <div
            key={d.day}
            className="group relative h-full flex-1"
            title={`Jour ${d.day} : ${d.net >= 0 ? "+" : ""}${d.net.toFixed(0)} €`}
          >
            <div
              className={cn(
                "absolute right-0 bottom-0 left-0 rounded-sm transition-colors",
                d.net >= 0
                  ? "bg-emerald-500 group-hover:bg-emerald-600"
                  : "bg-red-400 group-hover:bg-red-500"
              )}
              style={{ height: `${heightPct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
