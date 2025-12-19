"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "w-full rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_30px_80px_rgba(2,4,13,0.65)] backdrop-blur-xl transition-colors duration-200 hover:border-white/20 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
