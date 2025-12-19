"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold uppercase tracking-wide transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-60",
        variant === "primary" &&
          "bg-gradient-to-r from-sky-400 via-fuchsia-500 to-emerald-400 text-white shadow-[0_15px_35px_rgba(8,47,73,0.45)] hover:opacity-90",
        variant === "secondary" &&
          "border border-white/15 bg-white/10 text-white shadow-[0_10px_25px_rgba(0,0,0,0.4)] hover:bg-white/20",
        variant === "ghost" && "text-white/80 hover:text-white hover:bg-white/10",
        variant === "destructive" &&
          "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-[0_15px_35px_rgba(127,29,29,0.45)] hover:opacity-90",
        size === "sm" && "px-3.5 py-1.5 text-[11px]",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-5 py-2.5 text-base",
        className,
      )}
      {...props}
    />
  );
}
