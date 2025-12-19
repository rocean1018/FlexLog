"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Toast = { id: string; type: "success" | "error" | "info"; message: string };

const ToastCtx = createContext<{
  push: (t: Omit<Toast, "id">) => void;
} | null>(null);

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const api = useMemo(() => {
    return {
      push: (t: Omit<Toast, "id">) => {
        const toast: Toast = { ...t, id: crypto.randomUUID() };
        setToasts((prev) => [...prev, toast]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== toast.id));
        }, 2600);
      },
    };
  }, []);

  // expose global helper
  useEffect(() => {
    (window as any).__flexlog_toast = api;
  }, [api]);

  return (
    <ToastCtx.Provider value={api}>
      <div className="pointer-events-none fixed right-4 top-4 z-[100] w-[340px] max-w-[calc(100vw-2rem)] space-y-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className={[
                "pointer-events-auto rounded-2xl border p-3 backdrop-blur",
                t.type === "success" && "border-emerald-900/60 bg-emerald-950/40",
                t.type === "error" && "border-red-900/60 bg-red-950/40",
                t.type === "info" && "border-zinc-800 bg-zinc-950/60",
              ].join(" ")}
            >
              <div className="text-sm text-zinc-100">{t.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const toast = {
  success: (message: string) => (window as any).__flexlog_toast?.push({ type: "success", message }),
  error: (message: string) => (window as any).__flexlog_toast?.push({ type: "error", message }),
  info: (message: string) => (window as any).__flexlog_toast?.push({ type: "info", message }),
};
