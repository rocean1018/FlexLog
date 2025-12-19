"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Flame, CalendarDays, Dumbbell, Settings } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const nav = [
  { href: "/log", label: "Log", icon: Flame },
  { href: "/foods", label: "Foods", icon: CalendarDays },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, supabaseAvailable } = useAuth();

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl">
        <div className="grid min-h-screen grid-rows-[1fr] lg:grid-cols-[260px,1fr]">
          <aside className="sticky top-0 hidden h-screen border-r border-zinc-900 bg-zinc-950/50 p-4 backdrop-blur lg:block">
            <Link href="/" className="block rounded-2xl px-3 py-2 hover:bg-zinc-900/40">
              <div className="text-sm text-zinc-400">FlexLog</div>
              <div className="text-base font-semibold">Dashboard</div>
            </Link>

            <div className="mt-4 grid gap-1">
              {nav.map((item) => {
                const active = path?.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition",
                      active ? "bg-zinc-900/50 ring-1 ring-zinc-800" : "hover:bg-zinc-900/30"
                    )}
                  >
                    <Icon className="h-4 w-4 text-zinc-300" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 space-y-1 text-xs text-zinc-500">
              <div>Guest mode by default. {supabaseAvailable ? "Supabase Auth enabled." : "Add Supabase keys to enable accounts."}</div>
              <div className="text-sm">
                {user ? (
                  <span className="text-zinc-300">Signed in as {user.email}</span>
                ) : (
                  <Link href="/auth" className="text-zinc-200 underline">
                    Create an account / sign in
                  </Link>
                )}
              </div>
            </div>
          </aside>

          <main className="pb-10">
            <div className="lg:hidden">
              <MobileTopNav />
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function MobileTopNav() {
  const path = usePathname();
  return (
    <div className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/70 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">FlexLog</Link>
        <div className="flex items-center gap-1">
          {nav.map((item) => {
            const active = path?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-2xl transition",
                  active ? "bg-zinc-900/60 ring-1 ring-zinc-800" : "hover:bg-zinc-900/30"
                )}
                title={item.label}
              >
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
