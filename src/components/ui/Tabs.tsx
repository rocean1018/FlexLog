"use client";

import { cn } from "@/lib/utils";

export function Tabs({
  label,
  value,
  onChange,
  tabs,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  tabs: { value: string; label: string }[];
}) {
  return (
    <div>
      {label ? <div className="text-sm text-zinc-400">{label}</div> : null}
      <div className="mt-2 inline-flex rounded-2xl border border-zinc-800 bg-zinc-950/40 p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              "rounded-2xl px-3 py-2 text-sm transition",
              value === t.value ? "bg-zinc-900/70 text-white" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
