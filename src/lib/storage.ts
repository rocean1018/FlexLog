"use client";

import type { DailyLog, FoodItem, MacroTargets, OnboardingState, Units, WorkoutDay } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";

const KEY = "flexlog:v1";
const DEVICE_KEY = "flexlog:device-id";
const SNAPSHOT_ENDPOINT = "/api/storage/snapshot";
const SUPABASE_SYNC_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const USER_SNAPSHOT_TABLE = "user_snapshots";

type StoreState = {
  units: Units | null;
  selectedDate: string | null;
  onboarding: OnboardingState | null;
  targets: MacroTargets | null;
  logs: Record<string, DailyLog>; // keyed by yyyy-MM-dd
  workoutDays: WorkoutDay[];
  indicators: Record<string, "dot">; // yyyy-MM-dd -> dot
  strengthTrackerEnabled: boolean;
  bodyweightOverride: number | null; // in the user's units
  weightLogs: Record<string, number>; // yyyy-MM-dd -> weight
};

let latestSnapshotPayload: StoreState | null = null;
let snapshotTimer: number | null = null;
let latestUserSnapshotPayload: StoreState | null = null;
let userSnapshotTimer: number | null = null;
let currentUserId: string | null = null;

function shouldSyncSnapshots() {
  return typeof window !== "undefined" && SUPABASE_SYNC_ENABLED;
}

export function setStoreUser(userId: string | null) {
  currentUserId = userId;
}

function ensureDeviceId() {
  if (typeof window === "undefined") return "server";
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (id) return id;
    id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return "fallback-device";
  }
}

function cloneState(state: StoreState): StoreState {
  return JSON.parse(JSON.stringify(state));
}

async function pushSnapshot(state: StoreState) {
  if (!shouldSyncSnapshots()) return;
  try {
    await fetch(SNAPSHOT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: ensureDeviceId(), state }),
    });
  } catch (err) {
    console.warn("Failed to sync Supabase snapshot", err);
  }
}

async function pushUserSnapshot(state: StoreState) {
  if (!currentUserId || !supabase) return;
  try {
    const { error } = await supabase.from(USER_SNAPSHOT_TABLE).upsert({
      user_id: currentUserId,
      state,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn("Failed to sync user snapshot", error);
  } catch (err) {
    console.warn("Failed to sync user snapshot", err);
  }
}

function scheduleSnapshot(state: StoreState) {
  if (!shouldSyncSnapshots()) return;

   // Signed-in users: sync to Supabase user_snapshots via RLS
  if (currentUserId && supabase) {
    latestUserSnapshotPayload = cloneState(state);
    if (userSnapshotTimer) return;
    userSnapshotTimer = window.setTimeout(() => {
      userSnapshotTimer = null;
      if (!latestUserSnapshotPayload) return;
      pushUserSnapshot(latestUserSnapshotPayload).catch(() => {
        // logged inside pushUserSnapshot
      });
    }, 1000);
    return;
  }

  // Guest fallback: sync to device-scoped snapshots
  latestSnapshotPayload = cloneState(state);
  if (snapshotTimer) return;
  snapshotTimer = window.setTimeout(() => {
    snapshotTimer = null;
    if (!latestSnapshotPayload) return;
    pushSnapshot(latestSnapshotPayload).catch(() => {
      // swallow; already logged inside pushSnapshot
    });
  }, 1000);
}

function defaultState(): StoreState {
  return {
    units: "lb",
    selectedDate: format(new Date(), "yyyy-MM-dd"),
    onboarding: null,
    targets: null,
    logs: {},
    workoutDays: [],
    indicators: {},
    strengthTrackerEnabled: true,
    bodyweightOverride: null,
    weightLogs: {},
  };
}

function read(): StoreState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

function write(next: StoreState) {
  localStorage.setItem(KEY, JSON.stringify(next));
  scheduleSnapshot(next);
}

export async function hydrateStoreForUser(userId: string) {
  if (!supabase) return { synced: false, reason: "supabase_not_configured" as const };

  setStoreUser(userId);
  const { data, error } = await supabase.from(USER_SNAPSHOT_TABLE).select("state").eq("user_id", userId).maybeSingle();
  if (error) {
    console.warn("Failed to fetch user snapshot", error);
    return { synced: false, reason: "fetch_error" as const };
  }
  if (data?.state) {
    // Replace local state with cloud copy; scheduleSync will push fresh snapshot afterward.
    localStorage.setItem(KEY, JSON.stringify(data.state));
    scheduleSnapshot(data.state);
    return { synced: true, reason: "loaded_remote" as const };
  }

  // No remote snapshot yet; push current local state so it follows the user.
  scheduleSnapshot(read());
  return { synced: true, reason: "no_remote" as const };
}

export function useStore() {
  const get = () => read();
  const set = (mutator: (s: StoreState) => StoreState) => {
    const next = mutator(get());
    write(next);
    return next;
  };

  return {
    exportAll: () => get(),
    clearAll: () => localStorage.removeItem(KEY),

    getUnits: () => get().units,
    setUnits: (units: Units) => set((s) => ({ ...s, units })),

    getSelectedDate: () => get().selectedDate,
    setSelectedDate: (selectedDate: string) => set((s) => ({ ...s, selectedDate })),

    getOnboarding: () => get().onboarding,
    setOnboarding: (onboarding: OnboardingState) => set((s) => ({ ...s, onboarding })),

    getTargets: () => get().targets,
    setTargets: (targets: MacroTargets) => set((s) => ({ ...s, targets })),

    getDailyLog: (date: string): DailyLog => {
      const s = get();
      return (
        s.logs[date] ?? {
          date,
          mealGroups: [],
        }
      );
    },
    setDailyLog: (log: DailyLog) =>
      set((s) => ({
        ...s,
        logs: {
          ...s.logs,
          [log.date]: log,
        },
        indicators: { ...s.indicators, [log.date]: "dot" },
      })),

    addFoodItem: (date: string, mealGroupId: string, item: FoodItem) =>
      set((s) => {
        const log = s.logs[date] ?? { date, mealGroups: [] };
        const mealGroups = log.mealGroups.map((g) =>
          g.id === mealGroupId ? { ...g, items: [...g.items, item] } : g
        );
        const nextLog = { ...log, mealGroups };
        return {
          ...s,
          logs: { ...s.logs, [date]: nextLog },
          indicators: { ...s.indicators, [date]: "dot" },
        };
      }),

    getDayIndicator: (date: string) => get().indicators[date] ?? "none",

    getWorkoutDays: () => get().workoutDays,
    setWorkoutDays: (workoutDays: WorkoutDay[]) => set((s) => ({ ...s, workoutDays })),

    getStrengthTrackerEnabled: () => get().strengthTrackerEnabled ?? true,
    setStrengthTrackerEnabled: (enabled: boolean) => set((s) => ({ ...s, strengthTrackerEnabled: enabled })),

    getBodyweightOverride: () => get().bodyweightOverride ?? null,
    setBodyweightOverride: (value: number | null) => set((s) => ({ ...s, bodyweightOverride: value })),

    bumpWorkoutIndicator: (date: string) => set((s) => ({ ...s, indicators: { ...s.indicators, [date]: "dot" } })),

    syncSnapshotsNow: () => pushSnapshot(get()),

    getWeightLogs: () => get().weightLogs ?? {},
    setWeightLog: (date: string, weight: number) =>
      set((s) => ({
        ...s,
        weightLogs: {
          ...s.weightLogs,
          [date]: weight,
        },
      })),
    removeWeightLog: (date: string) =>
      set((s) => {
        const next = { ...s.weightLogs };
        delete next[date];
        return { ...s, weightLogs: next };
      }),
  };
}
