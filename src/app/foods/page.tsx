"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StickyHeader } from "@/components/StickyHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useStore } from "@/lib/storage";
import { FoodResult } from "@/lib/types";
import { toast } from "@/components/ui/Toaster";
import { debounce } from "@/lib/utils";
import { Search, ScanLine, Plus } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";

export default function FoodsPage() {
  const store = useStore();
  const searchParams = useSearchParams();
  const date = store.getSelectedDate() ?? new Date().toISOString().slice(0, 10);
  const log = store.getDailyLog(date);

  const [groupId, setGroupId] = useState<string>(log.mealGroups[0]?.id ?? "");
  const selectedGroupParam = searchParams.get("group");

  useEffect(() => {
    if (selectedGroupParam && log.mealGroups.some((g) => g.id === selectedGroupParam)) {
      setGroupId(selectedGroupParam);
      return;
    }
    if (!groupId && log.mealGroups[0]?.id) setGroupId(log.mealGroups[0].id);
  }, [selectedGroupParam, log.mealGroups, groupId]);

  const groupOptions = useMemo(
    () => log.mealGroups.map((g) => ({ value: g.id, label: g.name })),
    [log.mealGroups]
  );

  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);

  const [barcode, setBarcode] = useState("");
  const [barcodeResult, setBarcodeResult] = useState<FoodResult | null>(null);

  const [custom, setCustom] = useState({ name: "", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

  const doSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) {
          setResults([]);
          return;
        }
        setLoading(true);
        try {
          const res = await fetch(`/api/foods/search?q=${encodeURIComponent(trimmed)}`);
          const data = await res.json();
          setResults(data.results ?? []);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 250),
    []
  );

  useEffect(() => {
    doSearch(q);
  }, [q, doSearch]);

  async function lookupBarcode(override?: string) {
    const code = (override ?? barcode).trim();
    if (!code) return;
    setBarcodeResult(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/foods/barcode?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      setBarcodeResult(data.result ?? null);
      if (!data.result) toast.error("No product found for that barcode. Try manual add.");
    } catch {
      toast.error("Barcode lookup failed. Try manual add.");
    } finally {
      setLoading(false);
    }
  }

  function addFoodToGroup(food: FoodResult, servings = 1) {
    if (!groupId) {
      toast.error("Create a meal group first (Daily Log → Add meal group).");
      return;
    }
    const multiplier = Number.isFinite(servings) && servings > 0 ? servings : 1;
    store.addFoodItem(date, groupId, {
      id: crypto.randomUUID(),
      name: food.name,
      source: food.source,
      sourceId: food.sourceId,
      barcode: food.barcode ?? null,
      qty: multiplier,
      unit: food.unit ?? "serving",
      calories: food.calories * multiplier,
      protein_g: food.protein_g * multiplier,
      carbs_g: food.carbs_g * multiplier,
      fat_g: food.fat_g * multiplier,
      createdAt: Date.now(),
    });
    toast.success(`Added to meal group.`);
  }

  function addCustom() {
    if (!custom.name.trim()) return;
    addFoodToGroup({
      name: custom.name.trim(),
      source: "CUSTOM",
      sourceId: null,
      calories: custom.calories,
      protein_g: custom.protein_g,
      carbs_g: custom.carbs_g,
      fat_g: custom.fat_g,
      unit: "serving",
    });
    setCustom({ name: "", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#02040d] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-20 h-96 w-96 rounded-full bg-sky-500/10 blur-[160px]" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-[200px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 py-10 space-y-8">
        <StickyHeader
          title="Foods"
          subtitle="Search USDA • Scan OFF • Manual fallback"
          className="border-white/10 bg-white/5"
          right={
            <Link href="/log">
              <Button variant="secondary">Back to log</Button>
            </Link>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
          <Card className="space-y-6 border-white/10 bg-white/5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/60">Add to</p>
              <h2 className="mt-1 text-2xl font-semibold">Today&apos;s log</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <Input label="Date" value={date} disabled />
                <Select
                  label="Meal group"
                  value={groupId}
                  onChange={setGroupId}
                  options={groupOptions.length ? groupOptions : [{ value: "", label: "No meal groups yet" }]}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-sky-500/10 via-transparent to-fuchsia-500/5 p-4 shadow-inner">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/80">
                <ScanLine className="h-4 w-4 text-sky-300" /> Barcode lookup (OFF)
              </div>
              <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-black/30 p-3">
                <BarcodeScanner
                  value={barcode}
                  onValueChange={setBarcode}
                  onDetected={(code) => lookupBarcode(code)}
                  disabled={loading}
                />
              </div>
              {barcodeResult ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3">
                  <FoodResultCard
                    food={barcodeResult}
                    onAdd={(servings) => addFoodToGroup(barcodeResult, servings)}
                    compact
                  />
                </div>
              ) : (
                <p className="mt-2 text-xs text-white/50">Scan a barcode to auto-fill nutrition data.</p>
              )}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/80">
                <Plus className="h-4 w-4 text-emerald-300" /> Manual entry
              </div>
              <div className="mt-4 grid gap-3">
                <Input label="Name" value={custom.name} onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Calories"
                    type="number"
                    value={custom.calories}
                    onChange={(e) => setCustom((c) => ({ ...c, calories: Number(e.target.value) }))}
                  />
                  <Input
                    label="Protein (g)"
                    type="number"
                    value={custom.protein_g}
                    onChange={(e) => setCustom((c) => ({ ...c, protein_g: Number(e.target.value) }))}
                  />
                  <Input
                    label="Carbs (g)"
                    type="number"
                    value={custom.carbs_g}
                    onChange={(e) => setCustom((c) => ({ ...c, carbs_g: Number(e.target.value) }))}
                  />
                  <Input
                    label="Fat (g)"
                    type="number"
                    value={custom.fat_g}
                    onChange={(e) => setCustom((c) => ({ ...c, fat_g: Number(e.target.value) }))}
                  />
                </div>
                <Button onClick={addCustom} className="self-start">
                  Add custom food
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border-white/10 bg-gradient-to-br from-[#050b18]/90 via-[#0c111f]/95 to-[#150b1a]/90">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <Input
                  label="Search foods (USDA FDC)"
                  placeholder="e.g., chicken breast, oats, rice"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Search className="h-4 w-4 text-sky-300" />
                {loading ? "Searching…" : `${results.length} results`}
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {results.length === 0 && q.trim() ? (
                <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white/70">
                  No results. Try a broader query or add a custom food.
                  <div className="mt-2 text-xs text-white/50">
                    If you&apos;re running locally and always see 0 results, set <span className="text-white">USDA_FDC_API_KEY</span> in{" "}
                    <span className="text-white">.env.local</span> and restart the dev server.
                  </div>
                </div>
              ) : null}

              {results.map((r) => (
                <div
                  key={`${r.source}-${r.sourceId ?? r.name}`}
                  className="rounded-3xl border border-white/10 bg-black/30 p-4 transition hover:border-white/30"
                >
                  <FoodResultCard food={r} onAdd={(servings) => addFoodToGroup(r, servings)} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const OZ_IN_GRAMS = 28.349523125;
const LB_IN_GRAMS = 453.59237;
const CUP_IN_GRAMS = 240; // rough water-based estimate

type UnitOption = { value: string; label: string; toGrams?: number };

function normalizePer(per: string | null | undefined) {
  if (!per) return null;
  const match = per.match(/([\d.]+)\s*(g|gram|grams|oz|ounce|ounces|lb|pound|pounds|ml|milliliter|milliliters|cup|cups)/i);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  const unitRaw = match[2].toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (unitRaw.startsWith("g")) return { grams: amount };
  if (unitRaw.startsWith("oz")) return { grams: amount * OZ_IN_GRAMS };
  if (unitRaw.startsWith("lb") || unitRaw.startsWith("pound")) return { grams: amount * LB_IN_GRAMS };
  if (unitRaw.startsWith("cup")) return { grams: amount * CUP_IN_GRAMS };
  if (unitRaw.startsWith("ml")) return { grams: amount }; // assume 1ml ~ 1g
  return null;
}

function getUnitOptions(food: FoodResult) {
  const normalized = normalizePer(food.per ?? undefined);
  const options: UnitOption[] = [];
  if (normalized?.grams) {
    const label = food.per ?? `${normalized.grams} g`;
    options.push({ value: "base", label, toGrams: normalized.grams });
    options.push({ value: "g", label: "Grams", toGrams: 1 });
    options.push({ value: "oz", label: "Ounces", toGrams: OZ_IN_GRAMS });
    options.push({ value: "cup", label: "Cups (est.)", toGrams: CUP_IN_GRAMS });
  } else {
    options.push({
      value: "serving",
      label: food.per ? `Per ${food.per}` : food.unit ?? "Serving",
    });
  }
  return { options, baseGrams: normalized?.grams ?? null };
}

function FoodResultCard({ food, onAdd, compact = false }: { food: FoodResult; onAdd: (servings: number) => void; compact?: boolean }) {
  const { options, baseGrams } = useMemo(() => getUnitOptions(food), [food]);
  const [unit, setUnit] = useState(options[0]?.value ?? "serving");
  const [quantity, setQuantity] = useState("1");

  useEffect(() => {
    if (!options.find((o) => o.value === unit) && options[0]) setUnit(options[0].value);
  }, [options, unit]);

  const parsed = parseFloat(quantity);
  const parsedValid = Number.isFinite(parsed) && parsed > 0;
  const safeQuantity = parsedValid ? parsed : 1;
  const selectedUnit = options.find((o) => o.value === unit);

  const multiplier = useMemo(() => {
    if (selectedUnit?.toGrams && baseGrams) {
      const gramsRequested = safeQuantity * selectedUnit.toGrams;
      return gramsRequested / baseGrams;
    }
    return safeQuantity;
  }, [selectedUnit, safeQuantity, baseGrams]);

  const scaled = {
    calories: food.calories * (parsedValid ? multiplier : 0),
    protein_g: food.protein_g * (parsedValid ? multiplier : 0),
    carbs_g: food.carbs_g * (parsedValid ? multiplier : 0),
    fat_g: food.fat_g * (parsedValid ? multiplier : 0),
  };
  const disabled = !parsedValid;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-lg text-white">{food.name}</div>
          <div className="text-sm text-white/70">
            {food.calories.toFixed(0)} kcal • P {food.protein_g.toFixed(0)}g • C {food.carbs_g.toFixed(0)}g • F {food.fat_g.toFixed(0)}g
          </div>
          <div className="mt-1 text-xs text-white/60">
            Source: {food.source === "FDC" ? "USDA FDC" : food.source} {food.brand ? `• ${food.brand}` : ""} {food.per ? `• per ${food.per}` : ""}
          </div>
        </div>
      </div>

      <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2 text-sm text-white/70 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="text-xs uppercase tracking-wide text-white/60">Amount</label>
          <input
            type="number"
            min="0.01"
            step="0.1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full max-w-[200px] rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40"
          />
          <label className="sr-only">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full max-w-[200px] rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-white/60">
            Adds {scaled.calories.toFixed(0)} kcal • P {scaled.protein_g.toFixed(0)}g • C {scaled.carbs_g.toFixed(0)}g • F {scaled.fat_g.toFixed(0)}g
          </span>
        </div>
        <Button size={compact ? "sm" : "md"} onClick={() => onAdd(multiplier)} disabled={disabled}>
          Add
        </Button>
      </div>
    </div>
  );
}
