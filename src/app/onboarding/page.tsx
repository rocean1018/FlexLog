"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { computeTargets, GoalMode, Units } from "@/lib/tdee";
import { useStore } from "@/lib/storage";
import { toast } from "@/components/ui/Toaster";

export default function OnboardingPage() {
  const store = useStore();

  const [units, setUnits] = useState<Units>(store.getUnits() ?? "lb");
  const [sex, setSex] = useState<"male" | "female">(store.getOnboarding()?.sex ?? "male");
  const [age, setAge] = useState<number>(store.getOnboarding()?.age ?? 18);
  const [heightCm, setHeightCm] = useState<number>(store.getOnboarding()?.heightCm ?? 175);
  const [weight, setWeight] = useState<number>(store.getOnboarding()?.weight ?? 160);

  const [activity, setActivity] = useState(store.getOnboarding()?.activity ?? "moderate");

  const [goalMode, setGoalMode] = useState<GoalMode>(store.getOnboarding()?.goalMode ?? "simple");
  const [simpleGoal, setSimpleGoal] = useState(store.getOnboarding()?.simpleGoal ?? "lose");
  const [percent, setPercent] = useState<number>(store.getOnboarding()?.percent ?? -15);
  const [rate, setRate] = useState<number>(store.getOnboarding()?.rate ?? (units === "lb" ? 0.75 : 0.35));

  const preview = useMemo(() => {
    return computeTargets({
      units,
      sex,
      age,
      heightCm,
      weight,
      activity,
      goalMode,
      simpleGoal,
      percent,
      rate,
    });
  }, [units, sex, age, heightCm, weight, activity, goalMode, simpleGoal, percent, rate]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <div className="text-sm text-zinc-400">Onboarding</div>
        <h1 className="text-2xl font-semibold tracking-tight">Set targets (TDEE + macros)</h1>
      </div>

      <div className="grid gap-4">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Units"
              value={units}
              onChange={(v) => {
                const next = v as Units;
                setUnits(next);
                store.setUnits(next);
              }}
              options={[
                { value: "lb", label: "Pounds (lb)" },
                { value: "kg", label: "Kilograms (kg)" },
              ]}
            />
            <Select
              label="Sex"
              value={sex}
              onChange={(v) => setSex(v as any)}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
            <Input label="Age" type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} />
            <Input label="Height (cm)" type="number" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} />
            <Input
              label={`Weight (${units})`}
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
            />
            <Select
              label="Activity"
              value={activity}
              onChange={(v) => setActivity(v)}
              options={[
                { value: "sedentary", label: "Sedentary" },
                { value: "light", label: "Light" },
                { value: "moderate", label: "Moderate" },
                { value: "very", label: "Very active" },
                { value: "athlete", label: "Athlete" },
              ]}
            />
          </div>
        </Card>

        <Card>
          <Tabs
            label="Goal mode"
            value={goalMode}
            onChange={(v) => setGoalMode(v as GoalMode)}
            tabs={[
              { value: "rate", label: "Rate-based" },
              { value: "percent", label: "% of TDEE" },
              { value: "simple", label: "Simple" },
            ]}
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {goalMode === "simple" && (
              <Select
                label="Goal"
                value={simpleGoal}
                onChange={(v) => setSimpleGoal(v)}
                options={[
                  { value: "lose", label: "Lose" },
                  { value: "maintain", label: "Maintain" },
                  { value: "gain", label: "Gain" },
                ]}
              />
            )}

            {goalMode === "percent" && (
              <Input
                label="Percent (negative = deficit)"
                type="number"
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
              />
            )}

            {goalMode === "rate" && (
              <Input
                label={`Rate (${units}/week)`}
                type="number"
                value={rate}
                step="0.05"
                onChange={(e) => setRate(Number(e.target.value))}
              />
            )}
          </div>

          <div className="mt-6 grid gap-3 rounded-2xl bg-zinc-950/40 p-4 ring-1 ring-zinc-800">
            <div className="text-sm text-zinc-400">Preview targets</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Calories" value={preview.targets.calories.toFixed(0)} />
              <Metric label="Protein (g)" value={preview.targets.protein_g.toFixed(0)} />
              <Metric label="Carbs (g)" value={preview.targets.carbs_g.toFixed(0)} />
              <Metric label="Fat (g)" value={preview.targets.fat_g.toFixed(0)} />
            </div>
            <div className="text-xs text-zinc-500">
              Uses Mifflin-St Jeor BMR + activity multiplier. Macro defaults can be adjusted later in Settings.
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button
              onClick={() => {
                store.setOnboarding({
                  units,
                  sex,
                  age,
                  heightCm,
                  weight,
                  activity,
                  goalMode,
                  simpleGoal,
                  percent,
                  rate,
                });
                store.setTargets(preview.targets);
                toast.success("Targets saved. Head to your Daily Log.");
              }}
            >
              Save targets
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-900/40 p-3 ring-1 ring-zinc-800">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}
