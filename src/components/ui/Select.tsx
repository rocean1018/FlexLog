"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

export function Select({
  label,
  value,
  onChange,
  options,
  className,
  disabled,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("block space-y-2", className, disabled && "opacity-60")}>
      {label ? <div className="text-[10px] uppercase tracking-[0.35em] text-white/60">{label}</div> : null}
      <select
        disabled={disabled}
        className={cn(
          "w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-white/40",
          disabled && "cursor-not-allowed opacity-70",
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
