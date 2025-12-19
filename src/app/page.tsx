"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sparkles, CalendarDays, Dumbbell } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm text-zinc-400">FlexLog</div>
            <h1 className="text-2xl font-semibold tracking-tight">Flexible calorie tracking + workout split notes</h1>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 text-zinc-300" />
              <div>
                <div className="font-medium">Daily log + calendar</div>
                <div className="text-sm text-zinc-400">Jump to any date and review your totals.</div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-zinc-300" />
              <div>
                <div className="font-medium">Meal Groups</div>
                <div className="text-sm text-zinc-400">No forced breakfast/lunch/dinner buckets.</div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-start gap-3">
              <Dumbbell className="mt-0.5 h-5 w-5 text-zinc-300" />
              <div>
                <div className="font-medium">Workout split tracker</div>
                <div className="text-sm text-zinc-400">Store your split + optionally track weights.</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/onboarding">
            <Button size="lg">Start tracking</Button>
          </Link>
          <Link href="/log">
            <Button variant="secondary" size="lg">Go to Daily Log</Button>
          </Link>
        </div>

        <div className="text-sm text-zinc-500">
          Runs in guest mode by default (localStorage). You can wire up Supabase later.
        </div>
      </div>
    </div>
  );
}
