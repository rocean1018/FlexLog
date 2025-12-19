"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  label,
  className,
  disabled,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={cn("block space-y-2", className, disabled && "opacity-60")}>
      {label ? <div className="text-[10px] uppercase tracking-[0.35em] text-white/60">{label}</div> : null}
      <input
        disabled={disabled}
        className={cn(
          "w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 transition focus:border-white/40 focus:outline-none",
          disabled && "cursor-not-allowed opacity-70",
        )}
        {...props}
      />
    </label>
  );
}
