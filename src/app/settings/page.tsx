"use client";

import Link from "next/link";
import { StickyHeader } from "@/components/StickyHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useStore } from "@/lib/storage";
import { useState } from "react";
import { toast } from "@/components/ui/Toaster";

export default function SettingsPage() {
  const store = useStore();
  const targets = store.getTargets();
  const [units, setUnits] = useState(store.getUnits() ?? "lb");
  const onboarding = store.getOnboarding();

  const [strengthEnabled, setStrengthEnabled] = useState<boolean>(store.getStrengthTrackerEnabled());
  const [bwOverride, setBwOverride] = useState<string>(() => {
    const v = store.getBodyweightOverride();
    return v === null || v === undefined ? "" : String(v);
  });

  const [calories, setCalories] = useState<number>(targets?.calories ?? 2000);
  const [protein, setProtein] = useState<number>(targets?.protein_g ?? 160);
  const [carbs, setCarbs] = useState<number>(targets?.carbs_g ?? 200);
  const [fat, setFat] = useState<number>(targets?.fat_g ?? 60);

  function save() {
    store.setUnits(units as any);
    store.setTargets({ calories, protein_g: protein, carbs_g: carbs, fat_g: fat });
    store.setStrengthTrackerEnabled(strengthEnabled);
    const parsed = bwOverride.trim() ? Number(bwOverride) : null;
    store.setBodyweightOverride(Number.isFinite(parsed as any) ? (parsed as any) : null);
    toast.success("Settings saved");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <StickyHeader
        title="Settings"
        subtitle="Targets, units, export"
        right={
          <Link href="/log">
            <Button variant="secondary">Back to log</Button>
          </Link>
        }
      />

      <div className="mt-4 grid gap-4">
        <Card>
          <div className="text-sm text-zinc-400">Units</div>
          <div className="mt-3 max-w-xs">
            <Select
              label="Bodyweight units"
              value={units}
              onChange={setUnits}
              options={[
                { value: "lb", label: "lb" },
                { value: "kg", label: "kg" },
              ]}
            />
          </div>
        </Card>

        <Card>
          <div className="text-sm text-zinc-400">Daily targets</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input label="Calories" type="number" value={calories} onChange={(e) => setCalories(Number(e.target.value))} />
            <Input label="Protein (g)" type="number" value={protein} onChange={(e) => setProtein(Number(e.target.value))} />
            <Input label="Carbs (g)" type="number" value={carbs} onChange={(e) => setCarbs(Number(e.target.value))} />
            <Input label="Fat (g)" type="number" value={fat} onChange={(e) => setFat(Number(e.target.value))} />
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={save}>Save</Button>
          </div>
        </Card>

        <Card>
          <div className="text-sm text-zinc-400">Strength tracker</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:items-end">
            <div>
              <div className="text-sm text-zinc-300">Strength Index</div>
              <div className="mt-1 text-xs text-zinc-500">
                Computes an estimated 1RM trend from logged weights and normalizes it by bodyweight.
              </div>
              <div className="mt-3">
                <Button
                  variant={strengthEnabled ? "secondary" : "ghost"}
                  onClick={() => setStrengthEnabled((v) => !v)}
                >
                  {strengthEnabled ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>
            <div>
              <Input
                label={`Bodyweight override (${units}) (optional)`}
                placeholder={onboarding?.weight ? `Using onboarding: ${onboarding.weight} ${onboarding.units}` : "Set in onboarding"}
                value={bwOverride}
                onChange={(e) => setBwOverride(e.target.value)}
              />
              <div className="mt-1 text-xs text-zinc-500">Leave blank to use your onboarding bodyweight.</div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={save}>Save</Button>
          </div>
        </Card>

        <Card>
          <div className="text-sm text-zinc-400">Data</div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={() => {
                const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "flexlog-export.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export JSON
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!confirm("Delete all local data?")) return;
                store.clearAll();
                toast.success("Local data cleared");
                location.href = "/";
              }}
            >
              Delete local data
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
