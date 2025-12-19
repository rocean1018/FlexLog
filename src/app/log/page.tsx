"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { StickyHeader } from "@/components/StickyHeader";
import { MonthCalendar } from "@/components/MonthCalendar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/storage";
import { DailyLog, MacroTargets, MealGroup } from "@/lib/types";
import { MealGroupCard } from "@/components/MealGroupCard";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const FALLBACK_DATE = "1970-01-01";

export default function LogPage() {
  const store = useStore();

  const [hydrated, setHydrated] = useState(false);
  const [date, setDate] = useState<string>(FALLBACK_DATE);
  const [log, setLog] = useState<DailyLog>({ date: FALLBACK_DATE, mealGroups: [] });
  const [targets, setTargets] = useState<MacroTargets | null>(null);

  useEffect(() => {
    const initialDate = store.getSelectedDate() ?? format(new Date(), "yyyy-MM-dd");
    setDate(initialDate);
    setLog(store.getDailyLog(initialDate));
    setTargets(store.getTargets());
    setHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hydrated) return;
    store.setSelectedDate(date);
    setLog(store.getDailyLog(date));
    setTargets(store.getTargets());
  }, [date, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    const all = log.mealGroups.flatMap((g) => g.items);
    const sum = all.reduce(
      (acc, it) => {
        acc.calories += it.calories;
        acc.protein_g += it.protein_g;
        acc.carbs_g += it.carbs_g;
        acc.fat_g += it.fat_g;
        return acc;
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
    return sum;
  }, [log]);

  const macroBreakdown = useMemo(
    () => [
      { key: "protein", label: "Protein", grams: totals.protein_g, color: "#38bdf8" },
      { key: "carbs", label: "Carbs", grams: totals.carbs_g, color: "#34d399" },
      { key: "fat", label: "Fat", grams: totals.fat_g, color: "#fbbf24" },
    ],
    [totals.protein_g, totals.carbs_g, totals.fat_g],
  );

  const remaining = targets
    ? {
        calories: Math.max(0, targets.calories - totals.calories),
        protein_g: Math.max(0, targets.protein_g - totals.protein_g),
        carbs_g: Math.max(0, targets.carbs_g - totals.carbs_g),
        fat_g: Math.max(0, targets.fat_g - totals.fat_g),
      }
    : null;

  function updateMealGroup(group: MealGroup) {
    const next = { ...log, mealGroups: log.mealGroups.map((g) => (g.id === group.id ? group : g)) };
    setLog(next);
    store.setDailyLog(next);
  }

  function addMealGroup(name: string) {
    const group: MealGroup = {
      id: crypto.randomUUID(),
      name,
      sortOrder: log.mealGroups.length,
      items: [],
      collapsed: false,
    };
    const next = { ...log, mealGroups: [...log.mealGroups, group] };
    setLog(next);
    store.setDailyLog(next);
  }

  function deleteMealGroup(groupId: string) {
    const next = { ...log, mealGroups: log.mealGroups.filter((g) => g.id !== groupId) };
    setLog(next);
    store.setDailyLog(next);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#02040d] text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-10 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-[200px]" />
        <div className="absolute left-[-10%] top-20 h-96 w-96 rounded-full bg-sky-500/20 blur-[180px]" />
        <div className="absolute bottom-[-30%] right-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-[160px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 py-10">
        <StickyHeader
          title="Daily Log"
          subtitle={format(parseISO(date), "EEE, MMM d")}
          className="border-white/10 bg-white/5 shadow-[0_15px_35px_rgba(0,0,0,0.35)]"
          right={
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/foods">
                <Button
                  variant="ghost"
                  className="rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-500 to-emerald-400 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_40px_rgba(56,189,248,0.3)]"
                >
                  Find food
                </Button>
              </Link>
              <Link href="/onboarding">
                <Button
                  variant="ghost"
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20"
                >
                  Targets
                </Button>
              </Link>
            </div>
          }
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px,1fr]">
          <Card className="border-white/10 bg-white/5 shadow-[0_25px_60px_rgba(3,7,18,0.45)]">
            <div className="text-xs uppercase tracking-[0.3em] text-sky-300">Plan</div>
            <div className="mt-2 text-3xl font-semibold">Calendar</div>
            <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-3">
              <MonthCalendar
                selectedDate={date}
                onSelectDate={setDate}
                getIndicator={hydrated ? (d) => store.getDayIndicator(d) : () => "none"}
              />
            </div>
          </Card>

          <div className="grid gap-5">
            <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-white/5 via-sky-500/10 to-fuchsia-600/10 shadow-[0_30px_80px_rgba(8,47,73,0.55)]">
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-200">Today</p>
                  <h1 className="mt-2 text-3xl font-semibold text-white">
                    {targets ? (
                      <>
                        <span className="text-transparent bg-gradient-to-r from-sky-300 via-fuchsia-300 to-emerald-300 bg-clip-text">
                          {totals.calories.toFixed(0)}
                        </span>{" "}
                        <span className="text-zinc-400">/ {targets.calories.toFixed(0)} kcal</span>
                      </>
                    ) : (
                      `${totals.calories.toFixed(0)} kcal`
                    )}
                  </h1>
                  <p className="mt-2 text-sm text-zinc-300">
                    Protein {totals.protein_g.toFixed(0)}g • Carbs {totals.carbs_g.toFixed(0)}g • Fat {totals.fat_g.toFixed(0)}g
                  </p>
                  {remaining && (
                    <p className="mt-3 text-xs text-zinc-300">
                      Remaining: <span className="text-sky-300">{remaining.calories.toFixed(0)} kcal</span> • P{" "}
                      {remaining.protein_g.toFixed(0)}g • C {remaining.carbs_g.toFixed(0)}g • F {remaining.fat_g.toFixed(0)}g
                    </p>
                  )}
                </div>

                <AddMealGroup onAdd={addMealGroup} />

                <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-white/10 blur-[90px]" />
              </div>
            </Card>

            <Card className="border-white/10 bg-gradient-to-br from-[#05192d]/90 via-[#0e0f1d] to-[#1d0f24]/90 shadow-[0_30px_60px_rgba(3,7,18,0.55)]">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,280px),1fr]">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm uppercase tracking-[0.2em] text-fuchsia-200">Macro breakdown</div>
                      <div className="text-xs text-zinc-400">Share of today&apos;s intake</div>
                    </div>
                    <div className="text-xs text-zinc-500">{totals.calories.toFixed(0)} kcal logged</div>
                  </div>
                  <MacroPie breakdown={macroBreakdown} />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.2em] text-sky-200">Goal progress</div>
                  <div className="text-xs text-zinc-400">
                    {targets ? "Percent of targets for each macro" : "Set macro targets to track progress"}
                  </div>
                  <MacroGoalBars totals={totals} targets={targets} />
                </div>
              </div>
            </Card>

            <AnimatePresence initial={false}>
              {log.mealGroups.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-zinc-300"
                >
                  No meal groups yet. Add one like “Meal 1” or “Snack”.
                </motion.div>
              ) : (
                <motion.div key="groups" layout className="grid gap-4">
                  {log.mealGroups
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((g) => (
                      <MealGroupCard
                        key={g.id}
                        date={date}
                        group={g}
                        onChange={updateMealGroup}
                        onDelete={() => deleteMealGroup(g.id)}
                      />
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddMealGroup({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="flex w-full flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 sm:w-auto sm:flex-row sm:items-end sm:bg-transparent sm:p-0">
      <Input
        label="Add meal group"
        placeholder="Meal 1 / Snack / Post-workout"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="min-w-[220px]"
      />
      <Button
        variant="ghost"
        className="rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-500 to-emerald-400 px-5 py-2 font-semibold text-white shadow-[0_10px_30px_rgba(236,72,153,0.35)] sm:w-auto"
        onClick={() => {
          const n = name.trim();
          if (!n) return;
          onAdd(n);
          setName("");
        }}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add meal
      </Button>
    </div>
  );
}

type MacroSegment = { key: string; label: string; grams: number; color: string };

function MacroPie({ breakdown }: { breakdown: MacroSegment[] }) {
  const total = breakdown.reduce((sum, seg) => sum + seg.grams, 0);
  let cursor = 0;
  const segments = breakdown.map((seg) => {
    const slice = total > 0 ? (seg.grams / total) * 360 : 0;
    const start = cursor;
    const end = start + slice;
    cursor = end;
    return `${seg.color} ${start}deg ${end}deg`;
  });
  const gradient = segments.length && total > 0 ? `conic-gradient(${segments.join(", ")})` : undefined;

  return (
    <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
      <div className="relative h-44 w-44">
        <div
          className="h-full w-full rounded-full border border-white/10 bg-black/40 shadow-[0_20px_60px_rgba(3,7,18,0.6)]"
          style={gradient ? { background: gradient } : {}}
        />
        <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-zinc-950 text-center text-xs text-zinc-400">
          <div>Total</div>
          <div className="text-lg font-semibold text-zinc-100">{total.toFixed(0)}g</div>
        </div>
      </div>

      <div className="space-y-4 text-sm">
        {breakdown.map((seg) => (
          <div key={seg.key} className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <div className="flex-1">
              <div className="text-base font-semibold text-white">{seg.label}</div>
              <div className="text-xs text-zinc-400">
                {seg.grams.toFixed(0)}g{" "}
                {total > 0 ? `(${((seg.grams / total) * 100).toFixed(0)}%)` : "(0%)"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MacroGoalBars({
  totals,
  targets,
}: {
  totals: { protein_g: number; carbs_g: number; fat_g: number };
  targets: MacroTargets | null;
}) {
  const data = [
    {
      key: "protein_g" as const,
      label: "Protein",
      value: totals.protein_g,
      target: targets?.protein_g ?? null,
      color: "#38bdf8",
    },
    {
      key: "carbs_g" as const,
      label: "Carbs",
      value: totals.carbs_g,
      target: targets?.carbs_g ?? null,
      color: "#34d399",
    },
    {
      key: "fat_g" as const,
      label: "Fat",
      value: totals.fat_g,
      target: targets?.fat_g ?? null,
      color: "#fbbf24",
    },
  ];

  return (
    <div className="mt-4 space-y-4">
      {data.map((row) => {
        const pct = row.target ? Math.min(100, (row.value / row.target) * 100) : 0;
        return (
          <div key={row.key} className="rounded-2xl border border-white/10 bg-black/30 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-zinc-400">
              <span>{row.label}</span>
              <span className="tracking-normal text-xs">
                {row.value.toFixed(0)}g{" "}
                {row.target ? ` / ${row.target.toFixed(0)}g` : ""}
              </span>
            </div>
            <div className="mt-2 h-3 rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: row.target ? `${pct}%` : "0%",
                  backgroundColor: row.color,
                  opacity: row.target ? 1 : 0.3,
                }}
              />
            </div>
            {!row.target ? (
              <div className="mt-1 text-[11px] text-zinc-500">Set a target to track {row.label.toLowerCase()} progress.</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
