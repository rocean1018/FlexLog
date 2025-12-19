"use client";

import { ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function StickyHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.div
      className={cn(
        "sticky top-0 z-30 rounded-3xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-xl shadow-[0_20px_60px_rgba(2,4,13,0.55)]",
        scrolled ? "border-white/15 bg-white/10" : "",
        className,
      )}
      animate={{ paddingTop: scrolled ? 12 : 16, paddingBottom: scrolled ? 12 : 16 }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-zinc-400">{subtitle}</div>
          <div className="text-xl font-semibold tracking-tight">{title}</div>
        </div>
        {right ? <div>{right}</div> : null}
      </div>
    </motion.div>
  );
}
