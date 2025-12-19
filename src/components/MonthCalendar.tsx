"use client";

import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

export function MonthCalendar({
  selectedDate,
  onSelectDate,
  getIndicator,
}: {
  selectedDate: string; // yyyy-MM-dd
  onSelectDate: (d: string) => void;
  getIndicator?: (d: string) => "none" | "dot";
}) {
  const selected = parseISO(selectedDate);
  const monthStart = startOfMonth(selected);
  const monthEnd = endOfMonth(selected);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const dow = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">{format(selected, "MMMM yyyy")}</div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-zinc-500">
        {dow.map((d, idx) => (
          <div key={`${d}-${idx}`} className="grid place-items-center py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          const active = isSameDay(d, selected);
          const inMonth = isSameMonth(d, selected);
          const ind = getIndicator?.(iso) ?? "none";

          return (
            <button
              key={iso}
              onClick={() => onSelectDate(iso)}
              className={cn(
                "relative grid h-10 place-items-center rounded-2xl border text-sm transition",
                inMonth ? "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700" : "border-zinc-900 bg-zinc-950/20 text-zinc-600",
                active ? "border-zinc-600 bg-zinc-900/50" : ""
              )}
            >
              <span>{format(d, "d")}</span>
              {ind === "dot" && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-zinc-300 opacity-80" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
