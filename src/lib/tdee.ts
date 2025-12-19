import type { MacroTargets, Units } from "@/lib/types";

export type GoalMode = "rate" | "percent" | "simple";
export type { Units };

type Params = {
  units: Units;
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weight: number;
  activity: "sedentary" | "light" | "moderate" | "very" | "athlete";
  goalMode: GoalMode;
  simpleGoal: "lose" | "maintain" | "gain";
  percent: number; // -15 means -15%
  rate: number; // units/week
};

const activityMult: Record<Params["activity"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  athlete: 1.9,
};

function toKg(units: Units, weight: number) {
  return units === "kg" ? weight : weight * 0.45359237;
}

export function mifflinStJeorBmr(sex: "male" | "female", age: number, heightCm: number, weightKg: number) {
  const s = sex === "male" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
}

export function computeTargets(p: Params): { tdee: number; targets: MacroTargets } {
  const weightKg = toKg(p.units, p.weight);
  const bmr = mifflinStJeorBmr(p.sex, p.age, p.heightCm, weightKg);
  const tdee = bmr * activityMult[p.activity];

  // Calorie target adjustment
  let calorieTarget = tdee;

  if (p.goalMode === "percent") {
    calorieTarget = tdee * (1 + p.percent / 100);
  } else if (p.goalMode === "simple") {
    const delta = p.simpleGoal === "lose" ? -0.15 : p.simpleGoal === "gain" ? 0.10 : 0;
    calorieTarget = tdee * (1 + delta);
  } else if (p.goalMode === "rate") {
    // kcal per lb ~3500, per kg ~7700
    const kcalPerUnit = p.units === "lb" ? 3500 : 7700;
    const weeklyDelta = p.rate * kcalPerUnit;
    // For "rate" we infer sign by asking user later; for now: positive rate => deficit (lose).
    // If you want explicit lose vs gain, make rate signed in UI.
    calorieTarget = tdee - weeklyDelta / 7;
  }

  // Macro heuristics:
  // Protein: 0.8g/lb (or 1.8g/kg) baseline, slightly higher on cut.
  const proteinPerKg = 1.8 + (calorieTarget < tdee ? 0.2 : 0);
  const protein_g = weightKg * proteinPerKg;

  // Fat: 0.8g/kg min (floor), then carbs remainder.
  const fat_g = Math.max(0.8 * weightKg, 45);

  const proteinCals = protein_g * 4;
  const fatCals = fat_g * 9;

  // Carbs fill the rest, clamp >= 0
  const carbs_g = Math.max(0, (calorieTarget - proteinCals - fatCals) / 4);

  const targets: MacroTargets = {
    calories: Math.round(calorieTarget),
    protein_g: Math.round(protein_g),
    carbs_g: Math.round(carbs_g),
    fat_g: Math.round(fat_g),
  };

  return { tdee: Math.round(tdee), targets };
}
