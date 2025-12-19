export type Units = "lb" | "kg";

export type GoalMode = "rate" | "percent" | "simple";

export type FoodSource = "FDC" | "OFF" | "CUSTOM";

export type MacroTargets = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type OnboardingState = {
  units: Units;
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weight: number; // in units
  activity: "sedentary" | "light" | "moderate" | "very" | "athlete";
  goalMode: GoalMode;
  simpleGoal: "lose" | "maintain" | "gain";
  percent: number; // for percent mode
  rate: number; // for rate mode, in units/week
};

export type FoodItem = {
  id: string;
  name: string;
  source: FoodSource;
  sourceId: string | null;
  barcode: string | null;
  qty: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  createdAt: number;
};

export type MealGroup = {
  id: string;
  name: string;
  sortOrder: number;
  collapsed: boolean;
  items: FoodItem[];
};

export type DailyLog = {
  date: string; // yyyy-MM-dd
  mealGroups: MealGroup[];
  notes?: string;
};

export type FoodResult = {
  name: string;
  brand?: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: FoodSource;
  sourceId: string | null;
  barcode?: string | null;
  unit?: string;
  per?: string | null;
};

export type WorkoutExerciseLog = {
  date: string; // yyyy-MM-dd
  weight: number;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  trackWeight: boolean;
  logs: WorkoutExerciseLog[];
};

export type WorkoutDay = {
  id: string;
  name: string;
  weekday: number | null;
  sortOrder: number;
  exercises: WorkoutExercise[];
};
